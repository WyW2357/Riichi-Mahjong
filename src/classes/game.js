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
  this.PassZhuang = false;        // 是否已经过庄
  this.LastRiverCard = '';        // {Card, Player}
  this.Stop = false;              // 是否停止
  this.ActionList = [];           // 行动列表
  this.KanNum = 0;                // 杠数
  this.MainCards = [];            // 牌山
  this.RestCardsNum = 70;         // 剩余牌数
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
    }
    this.DealCards();
    this.RestCardsNum = 70;
    this.KanNum = 0;
    this.MainCards = [{}, {}, {}, {}, this.Deck.DealRandomCard()];  // 牌山
    this.LastRiverCard = [];
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
    this.Log(`${theplayer.UserName} 抓牌`);
    theplayer.DrawCard = this.Deck.DealRandomCard();
    this.RestCardsNum--;
    this.DrawCheck(theplayer);
    for (let player of this.Players) player.Status = '';
    if (this.Stop) theplayer.Status = 'WaitingCardOrAction';
    else theplayer.Status = 'WaitingCard';
    this.Log(`${theplayer.UserName} 抓牌后状态: ${theplayer.Status}`);
    this.Rerender();
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
    for (let player of this.Players) player.Status = '';
    for (let player of this.Players) if (player.Position === nextPos) this.Draw(player);
  };

  // 发牌
  this.DealCards = () => {
    this.Deck.Shuffle();
    for (let player of this.Players) {
      player.HandCards = [];
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

  // 抓牌检查
  this.DrawCheck = (theplayer) => {
    this.Log('DrawCheck ' + theplayer.UserName);
    this.Stop = false;
    for (let player of this.Players) player.Options = [];
    if (this.RestCardsNum > 0 && this.KanNum <= 4 && this.CanAnKanOrKakan(theplayer)) { theplayer.Options.push('Kan'); this.Stop = true; }
    if (this.CanRiichi(theplayer)) { theplayer.Options.push('Riichi'); this.Stop = true; this.Log(`${theplayer.UserName} 可以立直`); }
    else { this.Log(`${theplayer.UserName} 不能立直`); }
    if (this.CanTsumo(theplayer)) { theplayer.Options.push('Tsumo'); this.Stop = true; }
    this.Log(`${theplayer.UserName} 可选行动: ${theplayer.Options.join(' ')}`);
  };

  // 检查
  this.PutOutCheck = (theplayer) => {
    this.Log('PutOutCheck');
    this.Stop = false;
    for (let player of this.Players) {
      player.Options = [];
      if (player === theplayer) continue; // 只对其他三家检查
      let stop = false;
      if (this.RestCardsNum > 0) {
        if (this.CanChi(player)) { player.Options.push('Chi'); this.Stop = true; stop = true; }
        if (this.CanPon(player)) { player.Options.push('Pon'); this.Stop = true; stop = true; }
        if (this.KanNum <= 4 && this.CanMinKan(player)) { player.Options.push('Kan'); this.Stop = true; stop = true; }
      }
      if (this.CanRon(player)) { player.Options.push('Ron'); this.Stop = true; stop = true; }
      if (stop) { player.Options.push('Pass'); }
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
    for (let c of theplayer.HandCards) if (c.Type === card.Type && ((c.Value === 0) || (c.Value === 5))) count++;
    if (card.Value == 5 && count == 3) {
      theplayer.Status = 'WaitingSelect';
      theplayer.Options = [
        [{ Value: 5, Type: card.Type }, { Value: 5, Type: card.Type }], // 55碰5
        [{ Value: 5, Type: card.Type }, { Value: 0, Type: card.Type }]  // 50碰5
      ];
      this.Rerender();
    }
    else if (card.Value == 0) this.Pon(theplayer, { Value: 5, Type: card.Type }, { Value: 5, Type: card.Type });
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
      this.Log(`${theplayer.UserName} 加杠了 ${kanCard.Value + kanCard.Type}`);
    }
    this.KanNum++;
    for (let player of this.Players) {
      player.Status = '';
      player.Options = [];
    }
    // 杠后翻新宝牌指示牌
    for (let i = this.MainCards.length - 1; i >= 0; i--) {
      if (Object.keys(this.MainCards[i]).length === 0) {
        this.MainCards[i] = this.Deck.DealRandomCard();
        this.Log(`新宝牌指示牌: ${this.MainCards[i].Value + this.MainCards[i].Type}`);
        break;
      }
    }
    this.Rerender();
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
    }
    this.Log(`${theplayer.UserName} 明杠了 ${kanCard.Value + kanCard.Type}`);
    // 杠后翻新宝牌指示牌
    for (let i = this.MainCards.length - 1; i >= 0; i--) {
      if (Object.keys(this.MainCards[i]).length === 0) {
        this.MainCards[i] = this.Deck.DealRandomCard();
        this.Log(`新宝牌指示牌: ${this.MainCards[i].Value + this.MainCards[i].Type}`);
        break;
      }
    }
    this.Rerender();
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
        if (show.Type === 'Chi') {
          cardsList.push(show.Cards[0].value.toString() + show.Cards[1].value.toString()
            + show.Cards[2].value.toString() + show.Cards[0].Type);
        } else if (show.Type === 'Pon') {
          cardsList.push(show.Cards[0].value.toString().repeat(3) + show.Cards[0].Type);
        } else if (show.Type === 'Minkan' || show.Type === 'Kakan') {
          cardsList.push(show.Cards[0].value.toString().repeat(4) + show.Cards[0].Type);
        } else if (show.Type === 'Ankan') {
          cardsList.push(show.Cards[0].value.toString().repeat(5) + show.Cards[0].Type);
        }
      }
    }
    return cardsList.join(" ");
  };

  // 立直
  this.Riichi = () => {

  };

  this.CanRiichi = (theplayer) => {
    // 副露状态不能立直
    if (Array.isArray(theplayer.ShowCards) && theplayer.ShowCards.length > 0) {
      for (meld of theplayer.ShowCards)
        if (meld.Type !== "Ankan")
          return false;
    }

    // 特定规则下，余牌不足4张不能立直
    if (this.RestCardsNum < 4)
      return false;

    // 检查听牌条件
    let handCardsString = this.HandCardsToString(theplayer.HandCards, theplayer.ShowCards, theplayer.DrawCard);
    this.Log(`${theplayer.UserName} 立直检查手牌: ${handCardsString}`);
    console.log(`立直检查手牌: ${handCardsString}`);
    let maj = new JapaneseMaj();
    let paixing = JapaneseMaj.getPaixingFromString(handCardsString);
    if (maj.calcXiangting(paixing).best.xiangTingCount !== 0)
      return false;
    return true;
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
      if (this.ActionList[0].Action == 'Pass') this.MoveToNext();
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
      if (maxPriority == 0) this.MoveToNext();
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
    if (Action == 'Riichi') this.Riichi(theplayer);
    if (Action == 'Ron') this.Ron(theplayer);
    if (Action == 'Tsumo') this.Tsumo(theplayer);
  }

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