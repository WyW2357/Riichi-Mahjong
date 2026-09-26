import { Server } from 'socket.io';
import Game from './game.ts';

const PORT = 3000;
const io = new Server(PORT);

const rooms = [];

const randomCode = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
const playerNames = (game) => game.Players.map((p) => p.UserName);

io.on('connection', (socket) => {
  const findSelf = () => {
    const game = rooms.find((r) => r.FindPlayer(socket.id));
    return game ? { game, player: game.FindPlayer(socket.id) } : {};
  };

  socket.on('host', ({ Username } = {}) => {
    if (!isValidName(Username)) return socket.emit('hostRoom', undefined);

    let code;
    do code = randomCode();
    while (rooms.some((r) => r.GameCode === code));

    const game = new Game(code, Username);
    rooms.push(game);
    game.AddPlayer(Username, socket);
    game.EmitToPlayers('hostRoom', { Code: code, Players: playerNames(game) });
  });

  socket.on('join', ({ Code, Username } = {}) => {
    const game = rooms.find((r) => r.GameCode === Code);
    if (!game || !isValidName(Username) || game.Players.some((p) => p.UserName === Username))
      return socket.emit('joinRoom', undefined);
    if (game.RoundInProgress) return socket.emit('joinRoom', { ERROR: 1 });

    game.AddPlayer(Username, socket);
    const Players = playerNames(game);
    game.EmitToPlayers('joinRoom', { Code, Players, ERROR: 0 });
    game.EmitToPlayers('hostRoom', { Code, Players });

    if (game.Players.length === 4) {
      game.EmitToPlayers('gameBegin', { Code });
      game.RoundInProgress = true;
      game.StartNewRound();
    }
  });

  socket.on('playerAction', ({ Action }) => {
    const { game, player } = findSelf();
    if (!game || !['WaitingCardOrAction', 'WaitingAction', 'WaitingTsumoOrKan'].includes(player.Status)) return;
    game.ActionList.push({ Player: player, Action });
    player.Status = '';
    game.ActionManager();
  });

  socket.on('selectCard', ({ Card, Type }) => {
    const { game, player } = findSelf();
    if (!game) return;

    switch (player.Status) {
      case 'WaitingCard':
      case 'WaitingCardOrAction':
        break;
      case 'WaitingTsumoOrKan':
        if (Type !== 'draw') return;
        player.IsYiFa = false;
        break;
      case 'WaitingRiichi':
        player.IsRiichi = true;
        player.IsYiFa = true;
        player.Points -= 1000;
        game.RiichiBang += 1;
        player.IsDoubleRiichi = game.Players.every((p) => p.ShowCards.length === 0) && player.HistoryCards.length === 0;
        break;
      default:
        return;
    }
    player.Status = '';
    game.PutOut(player, Card, Type);
  });

  socket.on('finalPon', ({ poncard1, poncard2 }) => {
    const { game, player } = findSelf();
    game?.Pon(player, poncard1, poncard2);
  });

  socket.on('finalChi', ({ chiCard1, chiCard2 }) => {
    const { game, player } = findSelf();
    game?.Chi(player, chiCard1, chiCard2);
  });

  socket.on('finalKan', ({ kanCard }) => {
    const { game, player } = findSelf();
    if (!game) return;
    player.DrawCard ? game.AnKanOrKakan(player, kanCard) : game.MinKan(player, kanCard);
  });
});

console.log(`running on port ${PORT}`);