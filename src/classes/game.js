const Deck = require('./deck');            // 引入牌组类
const Player = require('./player');        // 引入玩家类
const fs = require('fs');                  // 引入文件系统模块
const path = require('path');              // 引入路径处理模块

const Game = function (code, host) {
  this.Deck = new Deck();         // 创建新的牌组实例
  this.Host = host;
  this.Players = [];              // 存储当前游戏中的玩家
  this.GameCode = code;           // 游戏房间名称
  this.StageNum = 1;               // 当前局数(1-8)
  this.RoundNum = 0;              // 当前本场数
  this.RiichiBang = 0;
  this.RoundInProgress = false;
  this.PassZhuang = false;
  this.LastRiverCard = '';        // { Card, Pre}
  this.Stop = false;

  this.MainCards = [];  // 牌山
  this.RestCardsNum = 70;
  this.LogQueue = [];             // 日志队列
  this.IsWriting = false;         // 日志写入锁
  this.ActionTimers = new Map();  // 玩家行动计时器

  // 清空同名GameData.txt
  const logFile = path.join(__dirname, `../../GameData/GameData_${this.GameCode}.txt`);
  fs.writeFile(logFile, '', (err) => {
    if (err)
      console.error('清空日志文件失败: ', err);
    else {
      this.Log('=== 创建新房间 ===');
      this.Log('房间号: ' + this.GameCode);
      this.Log('================');
    }
  });

  // 日志记录函数
  this.Log = (...args) => {
    // 将日志加入队列
    const logMessage = args.join(' ') + '\n';
    this.LogQueue.push(logMessage);
    // 如果当前没有在写入，则开始写入
    if (!this.IsWriting) this.WriteLog();
  };

  // 写入日志到文件
  this.WriteLog = () => {
    if (this.LogQueue.length === 0) {
      this.IsWriting = false;
      return;
    }
    this.IsWriting = true;
    const logMessage = this.LogQueue.shift();
    const logFile = path.join(__dirname, `../../GameData/GameData_${this.GameCode}.txt`);
    fs.appendFile(logFile, logMessage, (err) => {
      if (err) console.error('写入日志文件失败: ', err);
      // 继续写入队列中的下一条日志
      this.WriteLog();
    });
  };

  // 添加玩家
  this.AddPlayer = (playerName, socket) => {
    const player = new Player(playerName, socket);

    // 初始化RiverCards为15张固定的牌
    player.RiverCards = [
      { Value: 1, Type: 'm', Turn: false }, { Value: 2, Type: 'm', Turn: false }, { Value: 3, Type: 'm', Turn: false },
      { Value: 4, Type: 'm', Turn: false }, { Value: 5, Type: 'm', Turn: false }, { Value: 6, Type: 'm', Turn: false },
      { Value: 7, Type: 'm', Turn: false }, { Value: 8, Type: 'm', Turn: false }, { Value: 9, Type: 'm', Turn: false },
      { Value: 1, Type: 'p', Turn: false }, { Value: 2, Type: 'p', Turn: true }, { Value: 3, Type: 'p', Turn: false },
      { Value: 4, Type: 'p', Turn: false }, { Value: 5, Type: 'p', Turn: false }, { Value: 6, Type: 'p', Turn: false },
      { Value: 7, Type: 'p', Turn: false }, { Value: 8, Type: 'p', Turn: false }, { Value: 9, Type: 'p', Turn: false },
      { Value: 7, Type: 's', Turn: false }, { Value: 8, Type: 's', Turn: false }, { Value: 9, Type: 's', Turn: false }
    ];
    player.DrawCard = { Value: 1, Type: 's' };
    player.ShowCards = [
      {
        Type: 'Chi',
        Cards: [
          { Value: 1, Type: 's' },
          { Value: 2, Type: 's' },
          { Value: 3, Type: 's' },
        ],
        Turn: [true, false, false],
        Closed: [false, false, false]
      }
    ];
    this.Players.push(player);
    // 分配位置：如果4人齐，随机分配0-3
    if (this.Players.length === 4) {
      // 生成0-3的随机排列
      const positions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 4; i++) {
        this.Players[i].Position = positions[i];
      }
      this.RoundInProgress = true;
    }
    return;
  };

  // 向所有玩家发布消息
  this.EmitToPlayers = (eventName, data) => {
    for (let player of this.Players) player.Emit(eventName, data);
  };

  // 查找玩家(使用socketid查找)
  this.FindPlayer = (socketid) => {
    for (let player of this.Players) if (player.Socket.id == socketid) return player;
    return null;
  };

  // 开始新一局
  this.StartNewRound = () => {
    for (let player of this.Players) {
      player.HandCards = [];
      //player.RiverCards = [];
      //player.ShowCards = [];
      player.HistoryCards = [];
      //player.DrawCard = '';
      player.Status = 'Riichi';
      player.Options = [];
    }
    this.DealCards();
    this.RestCardsNum = 70;
    // 打印所有玩家信息
    this.Log('\n\n=== 新一局开始 ===');
    this.Log('东' + this.StageNum + '局  ' + this.RoundNum + '本场');
    this.Log('玩家信息: ');
    for (let player of this.Players) {
      this.Log(player.UserName + ' ' + player.HandCards.map(card => card.Value + card.Type).join(' ') + ' ' + player.Position);
      if (player.Position == 0) {
        this.Draw(player);
        player.Status = 'Waiting';
      }
    }
    this.MainCards = [{}, {}, {}, {}, this.Deck.DealRandomCard()];  // 牌山
    this.LastRiverCard = [];
    this.Rerender();
  };

  // 转到下一个玩家
  this.MoveToNext = () => {
    let currentPos = 0;
    for (let player of this.Players) {
      if (player.Status == 'Waiting') {
        player.Status = '';
        currentPos = player.Position;
      }
    }
    let nextPos = (currentPos + 1) % 4;
    for (let player of this.Players) {
      if (player.Position === nextPos) {
        this.Draw(player);
        player.Status = 'Waiting';
      }
    }
    this.Rerender();
  };

  // 发牌
  this.DealCards = () => {
    this.Deck.Shuffle();
    for (let player of this.Players) {
      player.HandCards = [];
      for (let i = 0; i < 10; i++) player.AddCard(this.Deck.DealRandomCard());
      player.SortHandCards();
    }
  };

  // 重新渲染
  this.Rerender = () => {
    // 只推送必要信息，手牌只推送给本人
    for (let player of this.Players) {
      const data = {
        Players: this.Players.map(p => ({
          UserName: p.UserName,
          Position: p.Position,
          Points: p.Points,
          Status: p.Status,
          HandCards: p.HandCards,
          RiverCards: p.RiverCards,
          ShowCards: p.ShowCards,
          DrawCard: p.DrawCard,
          Options: p.Options
        })),
        Position: player.Position,
        StageNum: this.StageNum,
        RoundNum: this.RoundNum,
        RiichiBang: this.RiichiBang,
        MainCards: this.MainCards,
        RestCardsNum: this.RestCardsNum
      };
      player.Emit('rerender', data);
    }
  };

  // 检查
  this.Check = () => {
    this.Stop = false;
    for (let player of this.Players) {
      player.Options = [];
      if (this.CanChi(player)) { player.Options.push('Chi'); this.Stop = true; }
      if (this.CanPon(player)) { player.Options.push('Pon'); this.Stop = true; }
      if (this.CanKan(player)) { player.Options.push('Kan'); this.Stop = true; }
      if (this.CanRiichi(player)) { player.Options.push('Riichi'); this.Stop = true; }
      if (this.CanRon(player)) { player.Options.push('Ron'); this.Stop = true; }
      if (this.CanTsumo(player)) { player.Options.push('Tsumo'); this.Stop = true; }
      if (this.CanPass(player)) { player.Options.push('Pass'); this.Stop = true; }
    }
    if (this.Stop) {
      for (let player of this.Players) player.Status = '';
      this.Rerender();
    }
  };

  // 抓牌
  this.Draw = (theplayer) => {
    theplayer.DrawCard = this.Deck.DealRandomCard();
    this.RestCardsNum--;
    this.Check();
  };

  // 插牌
  this.PutIn = (theplayer) => {
    theplayer.AddCard(theplayer.DrawCard);
    theplayer.SortHandCards();
    theplayer.DrawCard = '';
  };

  // 打牌
  this.PutOut = (theplayer, card, type) => {
    // 复制一份card，带Turn属性
    let riverCard = Object.assign({}, card, { Turn: false });
    theplayer.RiverCards.push(riverCard);
    theplayer.HistoryCards.push(card);
    if (type == 'draw') theplayer.DrawCard = '';
    if (type == 'hand') {
      theplayer.RemoveCard(card);
      if (!this.Stop)
        this.PutIn(theplayer);
    }
    this.LastRiverCard = { Card: card, Pre: theplayer.Position };
    this.Check();
    if (!this.Stop) this.MoveToNext();
  };

  // 吃
  this.Chi = () => {

  };

  this.CanChi = (theplayer) => {

  };

  // 碰
  this.Pon = (theplayer) => {
    const card = this.LastRiverCard.Card;
    theplayer.RemoveCard(card);
    theplayer.RemoveCard(card);
    var turn = [];
    if ((theplayer.Position - this.LastRiverCard.Pre + 4) % 4 == 1) turn = [true, false, false];
    if ((theplayer.Position - this.LastRiverCard.Pre + 4) % 4 == 2) turn = [false, true, false];
    if ((theplayer.Position - this.LastRiverCard.Pre + 4) % 4 == 3) turn = [false, false, true];
    theplayer.ShowCards.unshift({
      Type: 'Pon',
      Cards: [card, card, card], // 三张一样的牌
      Turn: [false, true, false], // 中间那张是横置（被碰的）
      Closed: [false, false, false]
    });
    theplayer.Options = [];
    this.Log(`${theplayer.UserName} 碰了 ${card.Value}${card.Type}`);

    // 删除被碰玩家的河牌最后一张
    const fromPlayer = this.Players.find(p => p.Position === this.LastRiverCard.Pre);
    if (fromPlayer && fromPlayer.RiverCards.length > 0) {
      fromPlayer.RiverCards.pop();
    }

    for (let p of this.Players) p.Status = '';
    theplayer.Status = 'Waiting';
  };

  this.CanPon = (theplayer) => {
    if (!this.LastRiverCard || !this.LastRiverCard.Card) return false;
    const card = this.LastRiverCard.Card;

    if (theplayer.Position === this.LastRiverCard.Pre) return false;

    let count = 0;
    for (let c of theplayer.HandCards) {
      if (c.Type === card.Type && c.Value === card.Value) count++;
    }
    return count >= 2;
  };

  // 杠
  this.Kan = () => {

  };

  this.CanKan = (theplayer) => {

  };

  // 立直
  this.Riichi = () => {

  };

  this.CanRiichi = (theplayer) => {

  };

  // 荣和
  this.Ron = () => {

  };

  this.CanRon = (theplayer) => {

  };

  // 自摸
  this.Tsumo = () => {

  };

  this.CanTsumo = (theplayer) => {

  };

  // 过
  this.Pass = () => {

  };

  this.CanPass = (theplayer) => {

  };

  // 开始下一局
  this.NextRound = () => {
    if (this.PassZhuang) {
      this.StageNum++;
      this.RoundNum = 0;
      for (let player of this.Players) {
        player.Position = (player.Position + 3) % 4;
      }
      this.PassZhuang = false;
    }
    else {
      this.RoundNum++;
    }
    this.StartNewRound();
  };




};

module.exports = Game; 