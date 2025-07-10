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
  this.RiichiBang = 1;
  this.RoundInProgress = false;

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
      { Value: 1, Type: 'm', Turn: false}, { Value: 2, Type: 'm', Turn: false}, { Value: 3, Type: 'm', Turn: false},
      { Value: 4, Type: 'm', Turn: false}, { Value: 5, Type: 'm', Turn: false}, { Value: 6, Type: 'm', Turn: false},
      { Value: 7, Type: 'm', Turn: false}, { Value: 8, Type: 'm', Turn: false}, { Value: 9, Type: 'm', Turn: false},
      { Value: 1, Type: 'p', Turn: false}, { Value: 2, Type: 'p', Turn: true}, { Value: 3, Type: 'p', Turn: false},
      { Value: 4, Type: 'p', Turn: false}, { Value: 5, Type: 'p', Turn: false}, { Value: 6, Type: 'p', Turn: false}
    ];
    player.DrawCard = { Value: 1, Type: 's' };
    player.ShowCards = [
      {
        Type:'Chi',
        Cards: [
          { Value: 1, Type: 's' },
          { Value: 2, Type: 's' },
          { Value: 3, Type: 's' }
        ],
        Turn: [true, false, false], 
        Closed: [false, false, false] 
      },
      {
        Type:'Pon',
        Cards: [
          { Value: 2, Type: 'p' },
          { Value: 2, Type: 'p' },
          { Value: 2, Type: 'p' }
        ],
        Turn: [false, true, false], 
        Closed: [false, false, false] 
      },
      {
        Type:'Kakan',
        Cards: [
          { Value: 7, Type: 'm' },
          { Value: 7, Type: 'm' },
          { Value: 7, Type: 'm' }
        ],
        Turn: [false, false, true],
        Closed: [false, false, false]
      },
      {
        Type:'Ankan',
        Cards: [
          { Value: 9, Type: 's' },
          { Value: 9, Type: 's' },
          { Value: 9, Type: 's' },
          { Value: 9, Type: 's' }
        ],
        Turn: [false, false, false, false], 
        Closed: [true, false, false, true] // 2张盖住，2张明牌
      }
    ];
    player.Status = 'Riichi';
    player.Options = ['Chi', 'Pon', 'Kan', 'Riichi', 'Ron', 'Tsumo', 'Pass'];
    this.MainCards = [{},{},{},{ Value: 4, Type: 'm' },{ Value: 2, Type: 'm' }];



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

  // 开始新一局
  this.StartNewRound = () => {
    this.DealCards();
    // 打印所有玩家信息
    this.Log('\n\n=== 新一局开始 ===');
    this.Log('东' + this.StageNum + '局  ' + this.RoundNum + '本场');
    this.Log('玩家信息: ');
    for (let player of this.Players) {
      this.Log(player.UserName + ' ' + player.HandCards.map(card => card.Value + card.Type).join(' ') + ' ' + player.Position);
    }
    this.Rerender();
  };

  // 发牌
  this.DealCards = () => {
    this.Deck.Shuffle();
    for (let player of this.Players) {
      player.HandCards = [];
      for(let i = 0; i < 1; i++) player.AddCard(this.Deck.DealRandomCard());
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

};

module.exports = Game; 