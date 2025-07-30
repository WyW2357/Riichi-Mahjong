const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Game = require('../classes/game.js');
const path = require('path');
// 创建 Express 应用和 HTTP 服务器
const app = express();
const server = http.createServer(app);
// 初始化 Socket.io
const io = socketio(server);
// 设置服务器端口
const PORT = process.env.PORT || 3000;
// 设置静态文件目录
app.use('/', express.static(path.join(__dirname, '../client')));
app.use('/GameData', express.static(path.join(__dirname, '../../GameData')));
// 存储所有游戏房间
let rooms = [];

// 监听客户端连接
io.on('connection', (socket) => {
  console.log('新的连接: ', socket.id);

  // 处理创建房间请求
  socket.on('host', (data) => {
    if (data.Username == '' || data.Username.length > 10) socket.emit('hostRoom', undefined);
    else {
      let code;
      do {
        code = '' + // 确保生成字符串 
              Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10);
      } while (rooms.length != 0 && rooms.some((r) => r.GameCode == code));
      // 创建新游戏实例并添加到房间列表
      const game = new Game(code, data.Username);
      rooms.push(game);
      game.AddPlayer(data.Username, socket);
      game.EmitToPlayers('hostRoom', {
        Code: code,
        Players: game.Players.map((p) => {return p.UserName})
      });
    }
  });

  // 处理加入房间请求
  socket.on('join', (data) => {
    const game = rooms.find((r) => r.GameCode == data.Code);
    if (game == undefined || game.Players.some((p) => p.UserName == data.Username) || data.Username == '' || data.Username.length > 10)
      socket.emit('joinRoom', undefined);
    else {
      if (game.RoundInProgress) {
        socket.emit('joinRoom', { ERROR: 1 });
      } else {
        // 加入游戏
        game.AddPlayer(data.Username, socket);
        game.EmitToPlayers('joinRoom', {
          Code: data.Code,
          Players: game.Players.map((p) => {return p.UserName}),
          ERROR: 0
        });
        game.EmitToPlayers('hostRoom', {
          Code: data.Code,
          Players: game.Players.map((p) => {return p.UserName})
        });
        if (game.Players.length == 4) {
          // 进入游戏界面
          game.EmitToPlayers('gameBegin', { Code: data.Code });
          game.RoundInProgress = true;
          game.StartNewRound();
        }
      }
    }
  });

  // 处理玩家按钮行动
  socket.on('playerAction', (data) => {
    const game = rooms.find((r) => {
      const player = r.FindPlayer(socket.id);
      return player && player.Socket && player.Socket.id == socket.id;
    });
    if (game) {
      const player = game.FindPlayer(socket.id);
      if(player.Status == 'WaitingCardOrAction' || player.Status == 'WaitingAction'){
      game.ActionList.push({Player: player, Action: data.Action});
      game.Log(`${player.UserName} 选择行动: ${data.Action}`);
      player.Status = '';
      game.ActionManager();
      }
    }
  });

  // 处理玩家点牌行动
  socket.on('selectCard', (data) => {
    const game = rooms.find((r) => {
      const player = r.FindPlayer(socket.id);
      return player && player.Socket && player.Socket.id == socket.id;
    });
    if (game) {
      const player = game.FindPlayer(socket.id);
      if(player.Status == 'WaitingCard' || player.Status == 'WaitingCardOrAction'){
        player.Status = '';
        game.PutOut(player, data.Card, data.Type);
      }
    }
  });

  // 处理玩家最终碰牌
  socket.on('finalPon', (data) => {
    const game = rooms.find((r) => {
      const player = r.FindPlayer(socket.id);
      return player && player.Socket && player.Socket.id == socket.id;
    });
    if (game) {
      const player = game.FindPlayer(socket.id);
      game.Pon(player, data.poncard1, data.poncard2);
    }
  });

  // 处理玩家最终吃牌
  socket.on('finalChi', (data) => {
    const game = rooms.find((r) => {
      const player = r.FindPlayer(socket.id);
      return player && player.Socket && player.Socket.id == socket.id;
    });
    if (game) {
      const player = game.FindPlayer(socket.id);
      game.Chi(player, data.chiCard1, data.chiCard2);
    }
  });

  // 处理玩家最终杠牌
  socket.on('finalKan', (data) => {
    const game = rooms.find((r) => {
      const player = r.FindPlayer(socket.id);
      return player && player.Socket && player.Socket.id == socket.id;
    });
    if (game) {
      const player = game.FindPlayer(socket.id);
      if (player.DrawCard) game.AnKanOrKakan(player, data.kanCard);
      else game.MinKan(player, data.kanCard);
    }
  });
});

  

// 启动服务器
server.listen(PORT, () => console.log(`正在端口 ${PORT} 运行`));