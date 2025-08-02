const Deck = require('./deck');            // 引入牌组类
const Player = require('./player');        // 引入玩家类
const fs = require('fs');                  // 引入文件系统模块
const path = require('path');              // 引入路径处理模块
const JapaneseMaj = require("../client/js/japanesemaj.min.js");

const Game = function (code, host) {
  this.Deck = new Deck();         // 创建新的牌组实例
  this.Host = host;               // 房主 socketid
  this.Players = [];              // 存储当前游戏中的玩家
  this.GameCode = code;           // 游戏房间名称
  this.StageNum = 1;              // 当前局数(1-8)
  this.RoundNum = 0;              // 当前本场数
  this.RiichiBang = 0;            // 立直棒数
  this.RoundInProgress = false;   // 是否正在进行
  this.LastRiverCard = '';        // {Card, Player}
  this.Stop = false;              // 是否停止
  this.ActionList = [];           // 行动列表
  this.KanNum = 0;                // 杠数
  this.MainCards = [];            // 牌山
  this.LiDora = [];               // 里宝牌
  this.RestCardsNum = 70;         // 剩余牌数
  this.KanBreak = '';             // 是否杠中断
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
    this.Players.push(player);
    // 分配位置：如果4人齐，随机分配0-3
    if (this.Players.length === 4) {
      // 生成0-3的随机排列
      const positions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 4; i++) {
        this.Players[i].Position = positions[i];
      }
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
      player.RiverCards = [];
      player.ShowCards = [];
      player.HistoryCards = [];
      player.DrawCard = '';
      player.Status = '';
      player.Options = [];
      player.IsRiichi = false;
      player.IsDoubleRiichi = false;
      player.IsYiFa = false;
      player.IsLingShang = false;
      player.TenPai = false;
    }
    this.DealCards();
    this.RestCardsNum = 70;
    this.KanNum = 0;
    this.KanBreak = '';
    this.MainCards = [];
    this.MainCards.push(this.Deck.DealRandomCard());
    this.LiDora = [];
    this.LiDora.push(this.Deck.DealRandomCard());
    this.LastRiverCard = { Card: {}, Player: null };
    // 打印所有玩家信息
    this.Log('\n\n=== 新一局开始 ===');
    if (this.StageNum <= 4) this.Log('东' + this.StageNum + '局  ' + this.RoundNum + '本场');
    else this.Log('南' + (this.StageNum - 4) + '局  ' + this.RoundNum + '本场');
    this.Log('玩家信息: ');
    for (let player of this.Players) this.Log(player.UserName + ' ' + player.HandCards.map(card => card.Value + card.Type).join(' ') + ' ' + player.Position);
    for (let player of this.Players) if (player.Position == 0) this.Draw(player);
  };

  // 抓牌
  this.Draw = (theplayer) => {
    if (this.RestCardsNum == 0) {
      this.Ryuukyoku();
      return;
    }
    this.Log(`${theplayer.UserName} 抓牌`);
    theplayer.DrawCard = this.Deck.DealRandomCard();
    this.RestCardsNum--;
    this.DrawCheck(theplayer);
    for (let player of this.Players) player.Status = '';
    if (this.Stop) {
      theplayer.Status = 'WaitingCardOrAction';
      if (theplayer.IsRiichi) theplayer.Status = 'WaitingTsumoOrKan';
      this.Rerender();
    }
    else if (theplayer.IsRiichi) {
      theplayer.IsYiFa = false;
      this.Rerender();
      setTimeout(() => {
        this.PutOut(theplayer, theplayer.DrawCard, 'draw');
      }, 500);
    }
    else {
      theplayer.Status = 'WaitingCard';
      this.Rerender();
    }
  };

  // 打牌
  this.PutOut = (theplayer, card, type) => {
    theplayer.IsLingShang = false;
    // 复制一份card，带Turn属性
    let riverCard = Object.assign({}, card, { Turn: !theplayer.RiverCards.some(c => c.Turn === true) && theplayer.IsRiichi });
    theplayer.RiverCards.push(riverCard);
    theplayer.HistoryCards.push(card);
    if (type == 'draw') theplayer.DrawCard = '';
    if (type == 'hand') {
      theplayer.RemoveCard(card);
      // 插牌
      if (theplayer.DrawCard) {
        theplayer.AddCard(theplayer.DrawCard);
        theplayer.SortHandCards();
        theplayer.DrawCard = '';
      }
    }
    this.LastRiverCard = { Card: card, Player: theplayer };
    this.PutOutCheck(theplayer);
    if (this.Stop) {
      for (let player of this.Players) {
        player.Status = player.Options.length === 0 ? '' : 'WaitingAction';
        this.Log(`${player.UserName} 打牌后状态: ${player.Status}`);
      }
      this.Rerender();
    }
    else this.MoveToNext();
  };

  // 转到下一个玩家
  this.MoveToNext = () => {
    let nextPos = (this.LastRiverCard.Player.Position + 1) % 4;
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
    }
    for (let player of this.Players) if (player.Position === nextPos) this.Draw(player);
  };

  // 发牌
  this.DealCards = () => {
    this.Deck.Shuffle();
    for (let player of this.Players) {
      /*player.HandCards = [{ Value: 2, Type: 'm' }, { Value: 3, Type: 'm' }, { Value: 4, Type: 'm' },
        { Value: 0, Type: 'm' }, { Value: 6, Type: 'm' }, { Value: 7, Type: 'p' },
        { Value: 7, Type: 'p' }, { Value: 9, Type: 's' }, { Value: 9, Type: 's' },
        { Value: 9, Type: 's' }, { Value: 2, Type: 'p' }, { Value: 2, Type: 'p' }, { Value: 2, Type: 'p' }];*/
      for (let i = 0; i < 13; i++) player.AddCard(this.Deck.DealRandomCard());
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
          Options: p.Options,
          IsRiichi: p.IsRiichi
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

  // 抓牌检查
  this.DrawCheck = (theplayer) => {
    this.Log('DrawCheck ' + theplayer.UserName);
    this.Stop = false;
    for (let player of this.Players) player.Options = [];
    if (this.RestCardsNum > 0 && this.KanNum <= 4 && this.CanAnKanOrKakan(theplayer)) { theplayer.Options.push('Kan'); this.Stop = true; }
    if (this.RestCardsNum > 0 && this.CanRiichi(theplayer) && !theplayer.IsRiichi) { theplayer.Options.push('Riichi'); this.Stop = true; }
    if (this.CanTsumo(theplayer, theplayer.IsLingShang)) { theplayer.Options.push('Tsumo'); this.Stop = true; }
    this.Log(`${theplayer.UserName} 可选行动: ${theplayer.Options.join(' ')}`);
  };

  // 打牌检查
  this.PutOutCheck = (theplayer) => {
    this.Log('PutOutCheck');
    this.Stop = false;
    for (let player of this.Players) {
      player.Options = [];
      if (player === theplayer) continue; // 只对其他三家检查
      let stop = false;
      if (this.RestCardsNum > 0 && !player.IsRiichi) {
        if (this.CanChi(player)) { player.Options.push('Chi'); this.Stop = true; stop = true; }
        if (this.CanPon(player)) { player.Options.push('Pon'); this.Stop = true; stop = true; }
        if (this.KanNum <= 4 && this.CanMinKan(player)) { player.Options.push('Kan'); this.Stop = true; stop = true; }
      }
      if (this.CanRon(player, false)) { player.Options.push('Ron'); this.Stop = true; stop = true; }
      if (stop) { player.Options.push('Pass'); }
      this.Log(`${player.UserName} 可选行动: ${player.Options.join(' ')}`);
    }
  };

  // 加杠检查
  this.KanCheck = (theplayer) => {
    this.Log('KanCheck');
    this.Stop = false;
    for (let player of this.Players) {
      player.Options = [];
      if (player === theplayer) continue; // 只对其他三家检查
      if (this.CanRon(player, true)) { player.Options.push('Ron'); this.Stop = true; player.Options.push('Pass'); }
      this.Log(`${player.UserName} 可选行动: ${player.Options.join(' ')}`);
    }
  };

  // 是否可以吃
  this.CanChi = (theplayer) => {
    const card = this.LastRiverCard.Card;
    if (card.Type === 'z') return false;

    // 只能吃上家
    const fromPos = this.LastRiverCard.Player.Position;
    const myPos = theplayer.Position;
    if ((myPos - fromPos + 4) % 4 !== 1) return false;

    // 只取同花色
    const hand = theplayer.HandCards.filter(c => c.Type === card.Type);
    // 0视为5
    const getValue = c => (c.Value === 0 ? 5 : c.Value);
    const values = hand.map(getValue);
    // 桌面打出的牌也视为5
    const cardValue = card.Value === 0 ? 5 : card.Value;

    // 右吃
    if (values.filter(v => v === cardValue - 2).length > 0 && values.filter(v => v === cardValue - 1).length > 0) return true;
    // 中吃
    if (values.filter(v => v === cardValue - 1).length > 0 && values.filter(v => v === cardValue + 1).length > 0) return true;
    // 左吃
    if (values.filter(v => v === cardValue + 1).length > 0 && values.filter(v => v === cardValue + 2).length > 0) return true;
    return false;
  };

  // 吃选择
  this.ChiSelect = (theplayer) => {
    // 只取同花色
    const hand = theplayer.HandCards.filter(c => c.Type === this.LastRiverCard.Card.Type);
    // 0视为5
    const getValue = c => (c.Value === 0 ? 5 : c.Value);
    // 桌面打出的牌也视为5
    const cardValue = (this.LastRiverCard.Card.Value === 0 ? 5 : this.LastRiverCard.Card.Value);

    let options = [];

    // 右吃：cardValue-2, cardValue-1, card
    let right1 = hand.filter(c => getValue(c) === cardValue - 2);
    let right2 = hand.filter(c => getValue(c) === cardValue - 1);
    if (right1.length && right2.length) {
      right1.forEach(c1 => {
        right2.forEach(c2 => {
          if (c1 !== c2) options.push([c1, c2]);
        });
      });
    }

    // 中吃：cardValue-1, card, cardValue+1
    let mid1 = hand.filter(c => getValue(c) === cardValue - 1);
    let mid2 = hand.filter(c => getValue(c) === cardValue + 1);
    if (mid1.length && mid2.length) {
      mid1.forEach(c1 => {
        mid2.forEach(c2 => {
          if (c1 !== c2) options.push([c1, c2]);
        });
      });
    }

    // 左吃：card, cardValue+1, cardValue+2
    let left1 = hand.filter(c => getValue(c) === cardValue + 1);
    let left2 = hand.filter(c => getValue(c) === cardValue + 2);
    if (left1.length && left2.length) {
      left1.forEach(c1 => {
        left2.forEach(c2 => {
          if (c1 !== c2) options.push([c1, c2]);
        });
      });
    }

    // 去重（防止同一组出现多次，按类型+实际值去重）
    options = options.filter((arr, idx, self) =>
      idx === self.findIndex(a =>
        a[0].Type === arr[0].Type && a[0].Value === arr[0].Value &&
        a[1].Type === arr[1].Type && a[1].Value === arr[1].Value
      )
    );

    if (options.length > 1) {
      theplayer.Status = 'WaitingSelect';
      theplayer.Options = options;
      this.Rerender();
    }
    else if (options.length === 1) this.Chi(theplayer, options[0][0], options[0][1]);
  };

  // 吃
  this.Chi = (theplayer, chiCard1, chiCard2) => {
    const card = this.LastRiverCard.Card;
    theplayer.RemoveCard(chiCard1);
    theplayer.RemoveCard(chiCard2);
    let chiSet = [card, chiCard1, chiCard2];
    theplayer.ShowCards.push({
      Type: 'Chi',
      Cards: chiSet,
      Turn: [true, false, false],
      Closed: [false, false, false]
    });
    this.Log(`${theplayer.UserName} 吃了 ${card.Value + card.Type}`);
    // 删除被吃玩家的河牌最后一张
    const fromPlayer = this.Players.find(p => p.Position === this.LastRiverCard.Player.Position);
    fromPlayer.RiverCards.pop();
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
      player.IsYiFa = false;
    }
    theplayer.Status = 'WaitingCard';
    this.Rerender();
  };

  // 是否可以碰
  this.CanPon = (theplayer) => {
    const card = this.LastRiverCard.Card;
    let count = 0;
    for (let c of theplayer.HandCards) {
      // 赤宝牌（Value=0）与普通5号牌可以配对
      if (c.Type === card.Type &&
        ((c.Value === card.Value) ||
          (c.Value === 0 && card.Value === 5) ||
          (c.Value === 5 && card.Value === 0))) {
        count++;
      }
    }
    return count >= 2;
  };

  // 碰选择
  this.PonSelect = (theplayer) => {
    const card = this.LastRiverCard.Card;
    let count = 0;
    let count0 = 0;
    for (let c of theplayer.HandCards) {
      if (c.Type === card.Type && ((c.Value === 0) || (c.Value === 5))) count++;
      if (c.Type === card.Type && c.Value === 0) count0++;
    }
    if (card.Value == 5 && count == 3) {
      theplayer.Status = 'WaitingSelect';
      theplayer.Options = [
        [{ Value: 5, Type: card.Type }, { Value: 5, Type: card.Type }], // 55碰5
        [{ Value: 5, Type: card.Type }, { Value: 0, Type: card.Type }]  // 50碰5
      ];
      this.Rerender();
    }
    else if (card.Value == 0) this.Pon(theplayer, { Value: 5, Type: card.Type }, { Value: 5, Type: card.Type });
    else if (card.Value == 5 && count0 == 1 && count == 2) this.Pon(theplayer, { Value: 0, Type: card.Type }, { Value: 5, Type: card.Type });
    else this.Pon(theplayer, card, card);
  }

  // 碰
  this.Pon = (theplayer, poncard1, poncard2) => {
    const card = this.LastRiverCard.Card;
    theplayer.RemoveCard(poncard1);
    theplayer.RemoveCard(poncard2);
    let turn = [];
    let ponCards = [];
    if ((theplayer.Position - this.LastRiverCard.Player.Position + 4) % 4 == 1) {
      ponCards = [card, poncard1, poncard2];
      turn = [true, false, false];
    }
    if ((theplayer.Position - this.LastRiverCard.Player.Position + 4) % 4 == 2) {
      ponCards = [poncard1, card, poncard2];
      turn = [false, true, false];
    }
    if ((theplayer.Position - this.LastRiverCard.Player.Position + 4) % 4 == 3) {
      ponCards = [poncard1, poncard2, card];
      turn = [false, false, true];
    }
    theplayer.ShowCards.push({
      Type: 'Pon',
      Cards: ponCards,
      Turn: turn,
      Closed: [false, false, false]
    });
    this.Log(`${theplayer.UserName} 碰了 ${card.Value + card.Type}`);
    // 删除被碰玩家的河牌最后一张
    const fromPlayer = this.Players.find(p => p.Position === this.LastRiverCard.Player.Position);
    fromPlayer.RiverCards.pop();
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
      player.IsYiFa = false;
    }
    theplayer.Status = 'WaitingCard';
    this.Rerender();
  };

  // 是否可以暗杠或加杠
  this.CanAnKanOrKakan = (theplayer) => {
    if (theplayer.DrawCard) {
      const typeMap = {};
      for (let c of theplayer.HandCards) {
        if (!typeMap[c.Type]) typeMap[c.Type] = [];
        typeMap[c.Type].push(c);
      }
      // 将HandCards和DrawCard合并统计
      if (!typeMap[theplayer.DrawCard.Type]) typeMap[theplayer.DrawCard.Type] = [];
      typeMap[theplayer.DrawCard.Type].push(theplayer.DrawCard);
      // 暗杠：只能在自己摸牌后（DrawCard有值）
      for (let type in typeMap) {
        const cards = typeMap[type];
        const zeroes = cards.filter(c => c.Value === 0);
        const fives = cards.filter(c => c.Value === 5);
        if (zeroes.length == 1 && fives.length == 3) return true;
        // 其他数字的暗杠
        const valueMap = {};
        for (let c of cards) {
          if ((type === 'm' || type === 'p' || type === 's') && (c.Value === 0 || c.Value === 5)) continue;
          const key = c.Value;
          if (!valueMap[key]) valueMap[key] = [];
          valueMap[key].push(c);
        }
        for (let v in valueMap) if (valueMap[v].length == 4) return true;
      }
      // 加杠（Kakan）：只要ShowCards中有Pon组，且手牌（含DrawCard）中有该组的第4张即可
      if (theplayer.ShowCards && theplayer.ShowCards.length > 0) {
        for (let show of theplayer.ShowCards) {
          if (show.Type === 'Pon') {
            const ponType = show.Cards[0].Type;
            const ponValue = show.Cards[0].Value === 0 ? 5 : show.Cards[0].Value;
            for (let c of theplayer.HandCards) if (c.Type === ponType && ((ponValue === 5 && c.Value === 0) || c.Value === ponValue)) return true;
            if (theplayer.DrawCard.Type === ponType && ((ponValue === 5 && theplayer.DrawCard.Value === 0) || theplayer.DrawCard.Value === ponValue)) return true;
          }
        }
      }
    }
    return false;
  };

  // 是否可以明杠
  this.CanMinKan = (theplayer) => {
    if (!theplayer.DrawCard) {
      const typeMap = {};
      for (let c of theplayer.HandCards) {
        if (!typeMap[c.Type]) typeMap[c.Type] = [];
        typeMap[c.Type].push(c);
      }
      if (theplayer.Position !== this.LastRiverCard.Player.Position) {
        const card = this.LastRiverCard.Card;
        const zeroes = typeMap[card.Type] ? typeMap[card.Type].filter(c => c.Value === 0) : [];
        const fives = typeMap[card.Type] ? typeMap[card.Type].filter(c => c.Value === 5) : [];
        if ((card.Type === 'm' || card.Type === 'p' || card.Type === 's') && (card.Value === 5 || card.Value === 0) && (zeroes.length + fives.length == 3)) return true;
        // 其他数字的明杠
        const valueMap = {};
        for (let c of (typeMap[card.Type] || [])) {
          if ((card.Type === 'm' || card.Type === 'p' || card.Type === 's') && (c.Value === 0 || c.Value === 5)) continue;
          const key = c.Value;
          if (!valueMap[key]) valueMap[key] = [];
          valueMap[key].push(c);
        }
        for (let v in valueMap) if (valueMap[v].length == 3 && valueMap[v][0].Value === card.Value) return true;
      }
    }
    return false;
  };

  // 暗杠或加杠选择
  this.AnKanOrKakanSelect = (theplayer) => {
    let kanOptions = [];
    const typeMap = {};
    for (let c of theplayer.HandCards) {
      if (!typeMap[c.Type]) typeMap[c.Type] = [];
      typeMap[c.Type].push(c);
    }
    if (!typeMap[theplayer.DrawCard.Type]) typeMap[theplayer.DrawCard.Type] = [];
    typeMap[theplayer.DrawCard.Type].push(theplayer.DrawCard);
    // 暗杠
    for (let type in typeMap) {
      const cards = typeMap[type];
      const zeroes = cards.filter(c => c.Value === 0);
      const fives = cards.filter(c => c.Value === 5);
      if (zeroes.length == 1 && fives.length == 3) kanOptions.push({ Value: 5, Type: type });
      // 其他数字的暗杠
      const valueMap = {};
      for (let c of cards) {
        if ((type === 'm' || type === 'p' || type === 's') && (c.Value === 0 || c.Value === 5)) continue;
        const key = c.Value;
        if (!valueMap[key]) valueMap[key] = [];
        valueMap[key].push(c);
      }
      for (let v in valueMap) if (valueMap[v].length == 4) kanOptions.push(valueMap[v][0]);
    }
    // 加杠
    if (theplayer.ShowCards && theplayer.ShowCards.length > 0) {
      for (let show of theplayer.ShowCards) {
        if (show.Type === 'Pon') {
          const ponType = show.Cards[0].Type;
          const ponValue = show.Cards[0].Value === 0 ? 5 : show.Cards[0].Value;
          for (let c of theplayer.HandCards) if (c.Type === ponType && ((ponValue === 5 && c.Value === 0) || c.Value === ponValue)) kanOptions.push(c);
          if (theplayer.DrawCard.Type === ponType && ((ponValue === 5 && theplayer.DrawCard.Value === 0) || theplayer.DrawCard.Value === ponValue)) kanOptions.push(theplayer.DrawCard);
        }
      }
    }
    // 处理选择
    if (kanOptions.length > 1) {
      theplayer.Status = 'WaitingSelect';
      theplayer.Options = kanOptions;
      this.Rerender();
    }
    else this.AnKanOrKakan(theplayer, kanOptions[0]);
  };

  // 明杠选择
  this.MinKanSelect = (theplayer) => {
    let kanOptions = [];
    const typeMap = {};
    for (let c of theplayer.HandCards) {
      if (!typeMap[c.Type]) typeMap[c.Type] = [];
      typeMap[c.Type].push(c);
    }
    const card = this.LastRiverCard.Card;
    const zeroes = typeMap[card.Type] ? typeMap[card.Type].filter(c => c.Value === 0) : [];
    const fives = typeMap[card.Type] ? typeMap[card.Type].filter(c => c.Value === 5) : [];
    if ((card.Type === 'm' || card.Type === 'p' || card.Type === 's') && (card.Value === 5 || card.Value === 0) && (zeroes.length + fives.length == 3)) kanOptions.push(card);
    // 其他数字的明杠
    const valueMap = {};
    for (let c of (typeMap[card.Type] || [])) {
      if ((card.Type === 'm' || card.Type === 'p' || card.Type === 's') && (c.Value === 0 || c.Value === 5)) continue;
      const key = c.Value;
      if (!valueMap[key]) valueMap[key] = [];
      valueMap[key].push(c);
    }
    for (let v in valueMap) if (parseInt(v) === card.Value && valueMap[v].length == 3) kanOptions.push(card);
    // 处理选择
    if (kanOptions.length > 1) {
      theplayer.Status = 'WaitingSelect';
      theplayer.Options = kanOptions;
      this.Rerender();
    }
    else this.MinKan(theplayer, kanOptions[0]);
  };

  // 暗杠或加杠
  this.AnKanOrKakan = (theplayer, kanCard) => {
    // 插牌
    theplayer.AddCard(theplayer.DrawCard);
    theplayer.SortHandCards();
    theplayer.DrawCard = '';
    let handCards = theplayer.HandCards.filter(c => c.Type === kanCard.Type && (c.Value === kanCard.Value || (c.Value === 0 && kanCard.Value === 5)));
    // 暗杠：移除4张
    if (handCards.length == 4) {
      for (let i = 0; i < 4; i++) theplayer.RemoveCard(handCards[i]);
      // 组装暗杠牌组，0必须放在中间两个，5必须放在两边
      let zeros = handCards.filter(c => c.Value === 0);
      let fives = handCards.filter(c => c.Value === 5);
      let kanCards = [];
      if (zeros.length === 1 && fives.length === 3) kanCards = [fives[0], fives[1], zeros[0], fives[2]];
      else kanCards = handCards;
      theplayer.ShowCards.push({
        Type: 'Ankan',
        Cards: kanCards,
        Turn: [false, false, false, false],
        Closed: [true, false, false, true]
      });
      this.Log(`${theplayer.UserName} 暗杠了 ${kanCard.Value + kanCard.Type}`);
      this.AnKanOrKakanContinue(theplayer);
    }
    // 加杠：移除1张，ShowCards中已有Pon，ShowCards只保留3张碰组
    else {
      theplayer.RemoveCard(kanCard);
      for (let show of theplayer.ShowCards) {
        if (show.Type === 'Pon') {
          const ponType = show.Cards[0].Type;
          const ponValue = show.Cards[0].Value === 0 ? 5 : show.Cards[0].Value;
          const kanCardValue = kanCard.Value === 0 ? 5 : kanCard.Value;
          if (kanCard.Type === ponType && kanCardValue === ponValue) {
            show.Type = 'Kakan';
            break;
          }
        }
      }
      this.LastRiverCard = { Card: kanCard, Player: theplayer };
      this.Log(`${theplayer.UserName} 加杠了 ${kanCard.Value + kanCard.Type}`);
      this.KanCheck(theplayer);
      if (this.Stop) {
        for (let player of this.Players) {
          player.Status = player.Options.length === 0 ? '' : 'WaitingAction';
          this.Log(`${player.UserName} 加杠后状态: ${player.Status}`);
        }
        this.KanBreak = { Is: true, Player: theplayer };
        this.Rerender();
      }
      else this.AnKanOrKakanContinue(theplayer);
    }
  };

  // 暗杠或加杠继续
  this.AnKanOrKakanContinue = (theplayer) => {
    this.KanNum++;
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
      player.IsYiFa = false;
    }
    // 杠后翻新宝牌指示牌
    this.MainCards.push(this.Deck.DealRandomCard());
    this.LiDora.push(this.Deck.DealRandomCard());
    this.Log(`新宝牌指示牌: ${this.MainCards[this.MainCards.length - 1].Value + this.MainCards[this.MainCards.length - 1].Type}`);
    this.Rerender();
    theplayer.IsLingShang = true;
    this.Draw(theplayer);
  };

  // 明杠
  this.MinKan = (theplayer, kanCard) => {
    // 明杠：移除3张，ShowCards加1组
    let handCards = theplayer.HandCards.filter(c => c.Type === kanCard.Type && (c.Value === kanCard.Value || (c.Value === 0 && kanCard.Value === 5) || (c.Value === 5 && kanCard.Value === 0)));
    for (let i = 0; i < 3; i++) theplayer.RemoveCard(handCards[i]);
    // Turn数组根据打牌来源调整
    let turn = [];
    let kanCards = [];
    let fromPos = this.LastRiverCard.Player.Position;
    let myPos = theplayer.Position;
    let rel = (myPos - fromPos + 4) % 4;
    if (rel === 1) {
      kanCards = [kanCard, handCards[0], handCards[1], handCards[2]];
      turn = [true, false, false, false];
    }
    if (rel === 2) {
      kanCards = [handCards[0], kanCard, handCards[1], handCards[2]];
      turn = [false, true, false, false];
    }
    if (rel === 3) {
      kanCards = [handCards[0], handCards[1], handCards[2], kanCard];
      turn = [false, false, false, true];
    }
    theplayer.ShowCards.push({
      Type: 'Minkan',
      Cards: kanCards,
      Turn: turn,
      Closed: [false, false, false, false]
    });
    // 移除出牌者的河牌最后一张
    const fromPlayer = this.Players.find(p => p.Position === this.LastRiverCard.Player.Position);
    fromPlayer.RiverCards.pop();
    this.KanNum++;
    // 清理状态
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
      player.IsYiFa = false;
    }
    this.Log(`${theplayer.UserName} 明杠了 ${kanCard.Value + kanCard.Type}`);
    // 杠后翻新宝牌指示牌
    this.MainCards.push(this.Deck.DealRandomCard());
    this.LiDora.push(this.Deck.DealRandomCard());
    this.Log(`新宝牌指示牌: ${this.MainCards[this.MainCards.length - 1].Value + this.MainCards[this.MainCards.length - 1].Type}`);
    this.Rerender();
    theplayer.IsLingShang = true;
    this.Draw(theplayer);
  };

  // 将手牌转换为字符串
  this.HandCardsToString = (handCards, ShowCards, drawCard) => {
    let cardsList = [];
    let handCardsString = handCards.map(card => card.Value + card.Type).join("");
    if (drawCard)
      handCardsString += drawCard.Value + drawCard.Type;
    cardsList.push(handCardsString);
    if (ShowCards && ShowCards.length > 0) {
      for (let show of ShowCards) {
        if (show.Type === 'Chi' || show.Type === 'Pon') {
          cardsList.push(show.Cards[0].Value.toString() + show.Cards[1].Value.toString() + show.Cards[2].Value.toString() + show.Cards[0].Type);
        } else if (show.Type === 'Minkan' || show.Type === 'Kakan') {
          if (show.Cards.some(c => (c.Value === 5 || c.Value === 0) && c.Type !== 'z')) cardsList.push('5505' + show.Cards[0].Type);
          else cardsList.push(show.Cards[0].Value.toString().repeat(4) + show.Cards[0].Type);
        } else if (show.Type === 'Ankan') {
          if (show.Cards.some(c => (c.Value === 5 || c.Value === 0) && c.Type !== 'z')) cardsList.push('55055' + show.Cards[0].Type);
          else cardsList.push(show.Cards[0].Value.toString().repeat(5) + show.Cards[0].Type);
        }
      }
    }
    return cardsList.join(" ");
  };

  this.CanRiichi = (theplayer) => {
    // 副露状态不能立直
    if (Array.isArray(theplayer.ShowCards) && theplayer.ShowCards.length > 0)
      for (let meld of theplayer.ShowCards) if (meld.Type !== 'Ankan') return false;
    // 检查听牌条件
    let handCardsString = this.HandCardsToString(theplayer.HandCards, theplayer.ShowCards, theplayer.DrawCard);
    let maj = new JapaneseMaj();
    let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
    if (maj.calcXiangting(paixing).best.xiangTingCount !== 0) return false;
    return true;
  };

  // 是否可以荣和
  this.CanRon = (theplayer, isKakan) => {
    let dora = [];
    let lidora = [];
    for (let i = 0; i < this.MainCards.length; i++) {
      dora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.MainCards[i])));
      lidora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.LiDora[i])));
    }
    let maj = new JapaneseMaj({
      changFeng: this.GetChangFeng(), // Number类型，东风场为1，南风场为2，西风场为3，北风场为4
      ziFeng: theplayer.Position + 1, // Number类型，自风，东1南2西3北4
      dora: dora, //Array[Pai]类型，宝牌数组，注意这里是宝牌数组不是宝牌指示牌数组
      lidora: theplayer.IsRiichi ? lidora : [], //Array[Pai]类型，里宝牌数组，注意这里是里宝牌数组不是里宝牌指示牌数组
      isLiangLiZhi: theplayer.IsDoubleRiichi, //是否两立直
      isLiZhi: theplayer.IsRiichi, //是否立直
      isYiFa: theplayer.IsYiFa, //是否一发
      isLingShang: false, //是否岭上
      isZimo: false, //是否自摸 
      isLast: this.RestCardsNum == 0, //是否是河底/海底
      isQiangGang: isKakan, //是否是抢杠
      isTianHe: false, //是否是天和
      isDiHe: false, //是否是地和
      isRenHe: false, //是否是人和
      isYanFan: false, //是否是燕返
      isGangZhen: false, //是否是杠振
      isGuYi: false, //是否是古役
      isLianFeng2Fu: false //连风牌雀头是否2符
    });
    let handCardsString = this.HandCardsToString(theplayer.HandCards, theplayer.ShowCards, this.LastRiverCard.Card);
    let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
    let res = maj.getYakuCalculator(paixing);
    if (res) {
      let pointRes = res.calcYaku(maj.state);
      let fan = pointRes.fan;
      return fan > 0;
    }
    return false;
  };

  // 荣和
  this.Ron = (theplayer, isKakan) => {
    let dora = [];
    let lidora = [];
    for (let i = 0; i < this.MainCards.length; i++) {
      dora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.MainCards[i])));
      lidora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.LiDora[i])));
    }
    let maj = new JapaneseMaj({
      changFeng: this.GetChangFeng(), // Number类型，东风场为1，南风场为2，西风场为3，北风场为4
      ziFeng: theplayer.Position + 1, // Number类型，自风，东1南2西3北4
      dora: dora, //Array[Pai]类型，宝牌数组，注意这里是宝牌数组不是宝牌指示牌数组
      lidora: theplayer.IsRiichi ? lidora : [], //Array[Pai]类型，里宝牌数组，注意这里是里宝牌数组不是里宝牌指示牌数组
      isLiangLiZhi: theplayer.IsDoubleRiichi, //是否两立直
      isLiZhi: theplayer.IsRiichi, //是否立直
      isYiFa: theplayer.IsYiFa, //是否一发
      isLingShang: false, //是否岭上
      isZimo: false, //是否自摸 
      isLast: this.RestCardsNum == 0, //是否是河底/海底
      isQiangGang: isKakan, //是否是抢杠
      isTianHe: false, //是否是天和
      isDiHe: false, //是否是地和
      isRenHe: false, //是否是人和
      isYanFan: false, //是否是燕返
      isGangZhen: false, //是否是杠振
      isGuYi: false, //是否是古役
      isLianFeng2Fu: false //连风牌雀头是否2符
    });
    let handCardsString = this.HandCardsToString(theplayer.HandCards, theplayer.ShowCards, this.LastRiverCard.Card);
    let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
    let res = maj.getYakuCalculator(paixing);
    let pointRes = res.calcYaku(maj.state);
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
      player.IsYiFa = false;
    }
    let pointsChange = [0, 0, 0, 0];
    pointsChange[theplayer.Position] = pointRes.point + 1000 * this.RiichiBang + 300 * this.RoundNum;
    pointsChange[this.LastRiverCard.Player.Position] = -(pointRes.point + 300 * this.RoundNum);
    this.RiichiBang = 0;
    let PassOya = theplayer.Position !== 0;
    for (let player of this.Players) {
      player.Emit('showRonResult', {
        position: player.Position,
        players: this.Players.map(p => ({
          Position: p.Position,
          UserName: p.UserName,
          Points: p.Points,
          PointsChange: pointsChange[p.Position],
        })),
        playerName1: theplayer.UserName,
        playerName2: this.LastRiverCard.Player.UserName,
        fan: pointRes.fan,
        fu: pointRes.fu.fu,
        yaku: pointRes.yaku,
        point: pointRes.point,
        dora: pointRes.dora,
        handCards: theplayer.HandCards,
        ronCard: this.LastRiverCard.Card,
        showCards: theplayer.ShowCards,
        doraIndicators: this.MainCards,
        liDoraIndicators: theplayer.IsRiichi ? this.LiDora : []
      });
    }
    theplayer.Points += (pointRes.point + 1000 * this.RiichiBang + 300 * this.RoundNum);
    this.LastRiverCard.Player.Points -= (pointRes.point + 300 * this.RoundNum);
    // setTimeout(() => {
    //   this.NextRound(PassOya, true);
    // }, 8000);
  };

  // 是否可以自摸
  this.CanTsumo = (theplayer, isLingShang) => {
    let dora = [];
    let lidora = [];
    for (let i = 0; i < this.MainCards.length; i++) {
      dora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.MainCards[i])));
      lidora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.LiDora[i])));
    }
    let maj = new JapaneseMaj({
      changFeng: this.GetChangFeng(), // Number类型，东风场为1，南风场为2，西风场为3，北风场为4
      ziFeng: theplayer.Position + 1, // Number类型，自风，东1南2西3北4
      dora: dora, //Array[Pai]类型，宝牌数组，注意这里是宝牌数组不是宝牌指示牌数组
      lidora: theplayer.IsRiichi ? lidora : [], //Array[Pai]类型，里宝牌数组，注意这里是里宝牌数组不是里宝牌指示牌数组
      isLiangLiZhi: theplayer.IsDoubleRiichi, //是否两立直
      isLiZhi: theplayer.IsRiichi, //是否立直
      isYiFa: theplayer.IsYiFa, //是否一发
      isLingShang: isLingShang, //是否岭上
      isZimo: true, //是否自摸 
      isLast: this.RestCardsNum == 0, //是否是河底/海底
      isQiangGang: false, //是否是抢杠
      isTianHe: this.Players.every(p => p.ShowCards.length == 0) && theplayer.HistoryCards.length == 0 && theplayer.Position == 0, //是否是天和
      isDiHe: this.Players.every(p => p.ShowCards.length == 0) && theplayer.HistoryCards.length == 0 && theplayer.Position !== 0, //是否是地和
      isRenHe: false, //是否是人和
      isYanFan: false, //是否是燕返
      isGangZhen: false, //是否是杠振
      isGuYi: false, //是否是古役
      isLianFeng2Fu: false //连风牌雀头是否2符
    });
    let handCardsString = this.HandCardsToString(theplayer.HandCards, theplayer.ShowCards, theplayer.DrawCard);
    let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
    let res = maj.getYakuCalculator(paixing);
    if (res) {
      let pointRes = res.calcYaku(maj.state);
      let fan = pointRes.fan;
      return fan > 0;
    }
    return false;
  };

  // 自摸
  this.Tsumo = (theplayer, isLingShang) => {
    let dora = [];
    let lidora = [];
    for (let i = 0; i < this.MainCards.length; i++) {
      dora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.MainCards[i])));
      lidora.push(JapaneseMaj.getPaiFromAscii(this.GetCardAscii(this.LiDora[i])));
    }
    let maj = new JapaneseMaj({
      changFeng: this.GetChangFeng(), // Number类型，东风场为1，南风场为2，西风场为3，北风场为4
      ziFeng: theplayer.Position + 1, // Number类型，自风，东1南2西3北4
      dora: dora, //Array[Pai]类型，宝牌数组，注意这里是宝牌数组不是宝牌指示牌数组
      lidora: theplayer.IsRiichi ? lidora : [], //Array[Pai]类型，里宝牌数组，注意这里是里宝牌数组不是里宝牌指示牌数组
      isLiangLiZhi: theplayer.IsDoubleRiichi, //是否两立直
      isLiZhi: theplayer.IsRiichi, //是否立直
      isYiFa: theplayer.IsYiFa, //是否一发
      isLingShang: isLingShang, //是否岭上
      isZimo: true, //是否自摸 
      isLast: this.RestCardsNum == 0, //是否是河底/海底
      isQiangGang: false, //是否是抢杠
      isTianHe: this.Players.every(p => p.ShowCards.length == 0) && theplayer.HistoryCards.length == 0 && theplayer.Position == 0, //是否是天和
      isDiHe: this.Players.every(p => p.ShowCards.length == 0) && theplayer.HistoryCards.length == 0 && theplayer.Position !== 0, //是否是地和
      isRenHe: false, //是否是人和
      isYanFan: false, //是否是燕返
      isGangZhen: false, //是否是杠振
      isGuYi: false, //是否是古役
      isLianFeng2Fu: false //连风牌雀头是否2符
    });
    let handCardsString = this.HandCardsToString(theplayer.HandCards, theplayer.ShowCards, theplayer.DrawCard);
    let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
    let res = maj.getYakuCalculator(paixing);
    let pointRes = res.calcYaku(maj.state);
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
      player.IsYiFa = false;
    }
    let pointsChange = [0, 0, 0, 0];
    pointsChange[theplayer.Position] = pointRes.point + 1000 * this.RiichiBang + 300 * this.RoundNum;
    if (theplayer.Position == 0) {
      for (let player of this.Players)
        if (player.Position !== theplayer.Position)
          pointsChange[player.Position] = -(pointRes.point_xian + 100 * this.RoundNum);
    }
    else {
      for (let player of this.Players)
        if (player.Position !== theplayer.Position)
          pointsChange[player.Position] = -(player.Position == 0 ? pointRes.point_qin + 100 * this.RoundNum : pointRes.point_xian + 100 * this.RoundNum);
    }
    this.RiichiBang = 0;
    let PassOya = theplayer.Position !== 0;
    for (let player of this.Players) {
      player.Emit('showTsumoResult', {
        position: player.Position,
        players: this.Players.map(p => ({
          Position: p.Position,
          UserName: p.UserName,
          Points: p.Points,
          PointsChange: pointsChange[p.Position],
        })),
        playerName: theplayer.UserName,
        fan: pointRes.fan,
        fu: pointRes.fu.fu,
        yaku: pointRes.yaku,
        point: pointRes.point,
        dora: pointRes.dora,
        handCards: theplayer.HandCards,
        tsumoCard: theplayer.DrawCard,
        showCards: theplayer.ShowCards,
        doraIndicators: this.MainCards,
        liDoraIndicators: theplayer.IsRiichi ? this.LiDora : []
      });
    }
    theplayer.Points += (pointRes.point + 1000 * this.RiichiBang + 300 * this.RoundNum);
    if (theplayer.Position == 0) {
      for (let player of this.Players)
        if (player.Position !== theplayer.Position)
          player.Points -= pointRes.point_xian + 100 * this.RoundNum;
    }
    else {
      for (let player of this.Players)
        if (player.Position !== theplayer.Position)
          player.Points -= player.Position == 0 ? pointRes.point_qin + 100 * this.RoundNum : pointRes.point_xian + 100 * this.RoundNum;
    }
    // setTimeout(() => {
    //   this.NextRound(PassOya, true);
    // }, 8000);
  };

  // 获取场风
  this.GetChangFeng = () => {
    if (this.StageNum >= 1 && this.StageNum <= 4) return 1;
    else if (this.StageNum >= 5 && this.StageNum <= 8) return 2;
    else if (this.StageNum >= 9 && this.StageNum <= 12) return 3;
    else if (this.StageNum >= 13 && this.StageNum <= 16) return 4;
  };

  // 获取牌指向宝牌的ASCII码
  this.GetCardAscii = (card) => {
    if (card.Value === 0 && card.Type === 'm') return 5;
    if (card.Value === 0 && card.Type === 'p') return 14;
    if (card.Value === 0 && card.Type === 's') return 23;
    if (card.Type === 'm') return card.Value % 9;
    if (card.Type === 'p') return card.Value % 9 + 9;
    if (card.Type === 's') return card.Value % 9 + 18;
    if (card.Type === 'z') {
      if (card.Value === 1) return 28;
      if (card.Value === 2) return 29;
      if (card.Value === 3) return 30;
      if (card.Value === 4) return 27;
      if (card.Value === 5) return 32;
      if (card.Value === 6) return 33;
      if (card.Value === 7) return 31;
    }
  }

  // 行动管理器
  this.ActionManager = () => {
    this.Log(`行动管理器运行`);
    for (let player of this.Players) {
      if (player.Status == 'WaitingAction' || player.Status == 'WaitingCardOrAction') {
        this.Log(`还有玩家未行动`);
        return;
      }
    }
    this.Log('当前ActionList: ' + JSON.stringify(
      this.ActionList.map(a => ({
        Player: a.Player && a.Player.UserName,
        Action: a.Action
      }))
    ));
    if (this.ActionList.length == 1) {
      if (this.ActionList[0].Action == 'Pass') {
        if (this.KanBreak.Is) {
          this.KanBreak.Is = false;
          this.AnKanOrKakanContinue(this.KanBreak.Player);
        }
        else this.MoveToNext();
      }
      else this.DoAction(this.ActionList[0].Player, this.ActionList[0].Action);
    }
    else {
      // 定义优先级：荣和 > 杠/碰 > 吃 > 过
      const actionPriority = {
        'Ron': 3,
        'Kan': 2,
        'Pon': 2,
        'Chi': 1,
        'Pass': 0
      };
      // 找出最高优先级
      let maxPriority = Math.max(...this.ActionList.map(a => actionPriority[a.Action] || 0));
      if (maxPriority == 0) {
        if (this.KanBreak.Is) {
          this.KanBreak.Is = false;
          this.AnKanOrKakanContinue(this.KanBreak.Player);
        }
        else this.MoveToNext();
      }
      else {
        let finalActions = this.ActionList.filter(a => actionPriority[a.Action] === maxPriority);
        if (maxPriority == 3) {
          // 按打牌顺序（Players顺序）选第一个有Ron的玩家
          let chosen = null;
          for (let i = 1; i < 4; i++) {
            chosen = finalActions.find(a => a.Player.Position === (this.LastRiverCard.Player.Position + i) % 4);
            if (chosen) {
              this.DoAction(chosen.Player, chosen.Action);
              break;
            }
          }
        }
        else this.DoAction(finalActions[0].Player, finalActions[0].Action);
      }
    }
    this.ActionList = [];
  }

  // 行动
  this.DoAction = (theplayer, Action) => {
    if (Action == 'Chi') this.ChiSelect(theplayer);
    if (Action == 'Pon') this.PonSelect(theplayer);
    if (Action == 'Kan') {
      if (!theplayer.DrawCard) this.MinKanSelect(theplayer);
      else this.AnKanOrKakanSelect(theplayer);
    }
    if (Action == 'Riichi') theplayer.Status = 'WaitingRiichi';
    if (Action == 'Ron') this.Ron(theplayer, this.KanBreak.Is);
    if (Action == 'Tsumo') this.Tsumo(theplayer, theplayer.IsLingShang);
  }

  // 开始下一局
  this.NextRound = (PassOya, AgariEnd) => {
    if (PassOya) {
      if (this.StageNum == 8) {
        this.EndGame();
        return;
      }
      this.StageNum++;
      for (let player of this.Players) player.Position = (player.Position + 3) % 4;
    }
    if (!AgariEnd || !PassOya) this.RoundNum++;
    else this.RoundNum = 0;
    this.StartNewRound();
  };

  // 流局
  this.Ryuukyoku = () => {
    this.Log('流局');
    let PointsBeforeRyuukyoku = this.Players.map(p => p.Points);
    for (let player of this.Players) {
      let handCardsString = this.HandCardsToString(player.HandCards, player.ShowCards, '');
      let maj = new JapaneseMaj();
      let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
      if (maj.calcXiangting(paixing).best.xiangTingCount == 0) player.TenPai = true;
    }
    let count = this.Players.filter(p => p.TenPai).length;
    let PassOya = false
    if (count == 0) PassOya = true;
    else if (count == 1) {
      for (let player of this.Players) {
        if (player.TenPai) player.Points += 3000;
        else player.Points -= 1000;
        if (player.Position == 0 && !player.TenPai) PassOya = true;
      }
    }
    else if (count == 2) {
      for (let player of this.Players) {
        if (player.TenPai) player.Points += 1500;
        else player.Points -= 1500;
        if (player.Position == 0 && !player.TenPai) PassOya = true;
      }
    }
    else if (count == 3) {
      for (let player of this.Players) {
        if (player.TenPai) player.Points += 1000;
        else player.Points -= 3000;
        if (player.Position == 0 && !player.TenPai) PassOya = true;
      }
    }
    else if (count == 4) PassOya = false;
    this.EmitToPlayers('showRyuukyokuResult', {
      playerName1: this.Players[0].UserName,
      playerName2: this.Players[1].UserName,
      playerName3: this.Players[2].UserName,
      playerName4: this.Players[3].UserName,
      playerPointsChange1: this.Players[0].Points - PointsBeforeRyuukyoku[0],
      playerPointsChange2: this.Players[1].Points - PointsBeforeRyuukyoku[1],
      playerPointsChange3: this.Players[2].Points - PointsBeforeRyuukyoku[2],
      playerPointsChange4: this.Players[3].Points - PointsBeforeRyuukyoku[3]
    });
    setTimeout(() => {
      this.NextRound(PassOya, false);
    }, 8000);
  }

  // 终局
  this.EndGame = () => {
    this.Log('终局');
    // 按点数排序
    this.Players.sort((a, b) => b.Points - a.Points);
    this.EmitToPlayers('showEndGameResult', {
      playerName1: this.Players[0].UserName,
      playerName2: this.Players[1].UserName,
      playerName3: this.Players[2].UserName,
      playerName4: this.Players[3].UserName,
      playerPoints1: this.Players[0].Points,
      playerPoints2: this.Players[1].Points,
      playerPoints3: this.Players[2].Points,
      playerPoints4: this.Players[3].Points
    });
  }
};

module.exports = Game; 