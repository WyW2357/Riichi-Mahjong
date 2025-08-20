// 页面加载完成后的初始化工作
$(document).ready(function () {
  // 初始化时隐藏游戏界面，等待用户操作
  $('#gameDiv').hide();
  // 初始化模态框（弹出窗口）功能，用于显示各种弹窗，如：用户名输入框、游戏规则说明等
  $('.modal-trigger').leanModal();
  // 初始化工具提示功能，设置延迟时间为50毫秒，当鼠标悬停在带有 tooltipped 类的元素上时，会显示提示信息
  $('.tooltipped').tooltip({ delay: 50 });

  // 初始化gameDiv桌面部分
  $('#gameDiv').html('<div class="main-content"></div>');
  // 预加载所有图片资源，确保游戏运行时不会出现图片加载延迟
  const images = [
    'img/Back.svg', 'img/RiichiBou.svg', 'img/Chi.svg', 'img/Pon.svg', 'img/Kan.svg',
    'img/Riichi.svg', 'img/Pass.svg', 'img/Ron.svg', 'img/Tsumo.svg',
    'img/0s.svg', 'img/0p.svg', 'img/0m.svg',
    'img/1s.svg', 'img/1p.svg', 'img/1m.svg',
    'img/2s.svg', 'img/2p.svg', 'img/2m.svg',
    'img/3s.svg', 'img/3p.svg', 'img/3m.svg',
    'img/4s.svg', 'img/4p.svg', 'img/4m.svg',
    'img/5s.svg', 'img/5p.svg', 'img/5m.svg',
    'img/6s.svg', 'img/6p.svg', 'img/6m.svg',
    'img/7s.svg', 'img/7p.svg', 'img/7m.svg',
    'img/8s.svg', 'img/8p.svg', 'img/8m.svg',
    'img/9s.svg', 'img/9p.svg', 'img/9m.svg',
    'img/1z.svg', 'img/2z.svg', 'img/3z.svg', 'img/4z.svg',
    'img/5z.svg', 'img/6z.svg', 'img/7z.svg',
    'img/0m-t.svg', 'img/0p-t.svg', 'img/0s-t.svg',
    'img/1m-t.svg', 'img/1p-t.svg', 'img/1s-t.svg',
    'img/2m-t.svg', 'img/2p-t.svg', 'img/2s-t.svg',
    'img/3m-t.svg', 'img/3p-t.svg', 'img/3s-t.svg',
    'img/4m-t.svg', 'img/4p-t.svg', 'img/4s-t.svg',
    'img/5m-t.svg', 'img/5p-t.svg', 'img/5s-t.svg',
    'img/6m-t.svg', 'img/6p-t.svg', 'img/6s-t.svg',
    'img/7m-t.svg', 'img/7p-t.svg', 'img/7s-t.svg',
    'img/8m-t.svg', 'img/8p-t.svg', 'img/8s-t.svg',
    'img/9m-t.svg', 'img/9p-t.svg', 'img/9s-t.svg',
    'img/1z-t.svg', 'img/2z-t.svg', 'img/3z-t.svg', 'img/4z-t.svg',
    'img/5z-t.svg', 'img/6z-t.svg', 'img/7z-t.svg',
  ];
  images.forEach(function (src) {
    const img = new Image();
    img.src = src;
  });

  // 预加载音效文件
  const sounds = [
    'sounds/Chi.mp3', 'sounds/Pon.mp3', 'sounds/Kan.mp3',
    'sounds/Riichi.mp3', 'sounds/Ron.mp3', 'sounds/Tsumo.mp3',
  ]
  window.gameSounds = {};
  sounds.forEach(function (src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    const audioName = src.split('/').pop().split('.')[0];
    window.gameSounds[audioName] = audio;
  });

  // 添加音效开关按钮
  $('#gameDiv').append('<button id="soundToggle" class="sound-toggle-btn">🔊</button>');
  localStorage.setItem('soundEnabled', false); // 默认音效关闭

  $('#soundToggle').on('click', function () {
    const isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    localStorage.setItem('soundEnabled', !isSoundEnabled);
    $(this).text(isSoundEnabled ? '🔇' : '🔊');
  });

  // 初始化按钮状态
  const isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  $('#soundToggle').text(isSoundEnabled ? '🔊' : '🔇');
});

var socket = io();

// 处理创建房间的响应，显示房间信息和玩家列表
socket.on('hostRoom', function (data) {
  if (data != undefined) {
    // 显示当前房间中的玩家列表
    $('#hostModalContent').html('<h5>房间号:</h5><code>' + data.Code + '</code><br /><h5>当前在房间中的玩家:</h5>');
    $('#playersNames').html(data.Players.map(function (p) { return '<span>' + p + '</span><br />'; }));
  }
  else {
    $('#hostModal').closeModal();
    Materialize.toast('输入了非法ID!(最长为10个字符)', 4000);
  }
});

// 处理加入房间的响应，显示等待界面
socket.on('joinRoom', function (data) {
  if (data == undefined) {
    $('#joinModal').closeModal();
    Materialize.toast("输入了非法房间号/ID!(最长为10个字符且不能和别人的一样)", 4000);
  } else {
    if (data.ERROR == 1) {
      $('#joinModal').closeModal();
      Materialize.toast("游戏已在进行中", 4000);
    }
    else {
      // 显示当前房间中的玩家列表
      $('#joinModalContent').html('<h5>房间号:</h5><code>' + data.Code + '</code><br /><h5>当前在房间中的玩家:</h5>');
      $('#playersNames2').html(data.Players.map(function (p) { return '<span>' + p + '</span><br />'; }));
    }
  }
});

// 处理游戏开始的响应，显示游戏界面
socket.on('gameBegin', function (data) {
  if (data == undefined) alert('错误 - 不存在游戏');
  else {
    // 隐藏导航栏和模态框
    $('#joinModal').closeModal();
    $('#hostModal').closeModal();
    $('#mainContent').hide();
    // 显示游戏界面
    $('#gameDiv').show();
  }
});

// 处理创建房间的请求，点击 获得房间号 按钮触发
var BeginHost = function () {
  // 发送创建房间请求到服务器
  socket.emit('host', { Username: $('#hostName').val() });
};

var JoinRoom = function () {
  socket.emit('join', {
    Code: $('#code').val(),
    Username: $('#joinName').val(),
  });
};

// 重新渲染游戏界面，更新所有玩家的状态
function GetCardImgSrc(card) {
  if (!card) return '';
  return 'img/' + card.Value + card.Type + (card.Transparent ? "-t" : "") + '.svg';
}

const positions = {
  east: {
    // 新增按钮区（第四行）
    buttonRow: Array.from({ length: 8 }, (_, i) => ({
      left: 328 + i * 80 + 80,
      top: 616 + 156
    }))
  }
};

socket.on('rerender', function (data) {
  const mainContent = $('#gameDiv .main-content');
  mainContent.html(''); // 清空桌面

  // 渲染牌桌中心部分
  mainContent.append('<div class="main-board"></div>')
  // 渲染牌山（MainCards）
  // var mainRows = [];
  // var row = data.MainCards.slice().map(function (card) {
  //   if (!card || Object.keys(card).length === 0)
  //     return '<span class="mj-card"><img class="mj-back" src="img/Back.svg"></span>';
  //   else
  //     return '<span class="mj-card"><img class="mj-front" src="' + GetCardImgSrc(card) + '"></span>';
  // }).join('');
  // mainRows.push(row);
  // $('#gameDiv').append('<div id="maincards" class="main-cards">' + mainRows.join('') + '</div>');

  let mainCardsHtml = '';
  for (let i = 0; i < 5; i++) {
    if (data.MainCards && data.MainCards[i])
      mainCardsHtml += '<span class="mj-card"><img class="mj-front" src="' + GetCardImgSrc(data.MainCards[i]) + '"></span>';
    else mainCardsHtml += '<span class="mj-card"><img class="mj-back" src="img/Back.svg"></span>';
  }
  mainContent.append('<div id="maincards" class="main-cards">' + mainCardsHtml + '</div>');

  // 牌山下方只显示局数、本场
  var stageStr = '';
  if (data.StageNum <= 4) stageStr = '东' + data.StageNum + '局';
  else if (data.StageNum <= 8) stageStr = '南' + (data.StageNum - 4) + '局';
  var roundStr = data.RoundNum !== undefined ? (data.RoundNum + '本场') : '';
  var infoHtml = '<div class="text">' + stageStr + ' ' + roundStr + '</div>';
  mainContent.append('<div id="tableinfo" class="table-info">' + infoHtml + '</div>');

  // 牌山下方50px处显示余牌数
  if (typeof data.RestCardsNum === 'number') {
    mainContent.append('<div id="restcards-info" class="rest-cards-info">余 ' + data.RestCardsNum + '</div>');
  }

  // 牌山上方显示立直棒图标+数量（0也显示）
  if (typeof data.RiichiBang !== 'undefined') {
    mainContent.append('<div id="riichibou-info" class="riichibou-info">'
      + '<img src="img/RiichiBou.svg" class="riichibou-img">'
      + '<span style="margin-left:6px;">× ' + data.RiichiBang + '</span>'
      + '</div>');
  }

  // 渲染四个方位label在桌布中心正方形区四角，顺序以自己为下方
  const windNames = ['东', '南', '西', '北'];
  const classNames = ['east', 'south', 'west', 'north'];
  for (let i = 0; i < 4; i++) {
    const windIdx = (data.Position + i) % 4;
    const wind = windNames[windIdx];
    const className = classNames[i];
    const activeStyle = (windIdx === data.ActivePlayer) ? ' style="background-color:#ffe066;' : ' style="background-color:#fff3;';
    const redStyle = (windIdx === 0) ? ' color:#d22;' : '';
    mainContent.append('<span class="wind-label ' + className + '"' + activeStyle + redStyle + '">' + wind + '</span>');
  }

  // 自己的振听标记
  if (data.IsFuriten) {
    mainContent.append('<span class="furiten-mark">振听</span>');
  }

  // 以自己为下方旋转Players数组
  const myPos = data.Position;
  const players = data.Players.slice().sort((a, b) => ((a.Position - myPos + 4) % 4) - ((b.Position - myPos + 4) % 4));
  const pos2dir = ['east', 'south', 'west', 'north'];
  players.forEach(function (player, idx) {
    var dir = pos2dir[idx]; // idx=0:自己, 1:下家, 2:对家, 3:上家
    // 渲染立直棒
    if (player.IsRiichi && player.RiichiProcessed) {
      mainContent.append('<img src="img/RiichiBou.svg" class="riichibou ' + dir + '">');
    }
    // 渲染点数
    mainContent.append('<div class="points ' + dir + '">' + player.Points + '</div>');

    // 创建tile-container
    mainContent.append('<div class="tile-container ' + dir + '"></div>');
    let tileContainer = $('#gameDiv .tile-container.' + dir);
    let leftBound = 120, rightBound = 882, houLeftBound = 332;
    let upperBound = 830, houUpperBound = 608;

    // 渲染id
    tileContainer.append('<span class="player-id">' + player.UserName + '</span>');

    // 渲染牌河
    for (let idx = 0; idx < (player.RiverCards || []).length; idx++) {
      let card = player.RiverCards[idx];
      let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
      let posStyle = '';
      if (card.Turn) {
        posStyle = 'left:' + (houLeftBound - 38) + 'px;top:' + (houUpperBound + 7) + 'px;transform:rotate(270deg);transform-origin:right top;';
        houLeftBound += 52;
      }
      else {
        posStyle = 'left:' + houLeftBound + 'px;top:' + houUpperBound + 'px;';
        houLeftBound += 38;
      }
      tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '">' + cardImg + '</span>');
      if (idx === 5 || idx === 11) {
        houLeftBound = 332;
        houUpperBound += 52; // 每6张牌换行
      }
    }

    // 将非流局情况的其他家手牌顺序调整为透明牌在前，非透明牌在后
    if (!data.IsRyuuKyoku && dir !== 'east') {
      player.HandCards = player.HandCards.filter(c => c.Transparent).concat(player.HandCards.filter(c => !c.Transparent));
    }

    // 渲染手牌（局中与流局两种情况）
    for (let idx = 0; idx < player.HandCards.length; idx++) {
      let card = player.HandCards[idx];
      let posStyle = 'left:' + leftBound + 'px;top:' + upperBound + 'px;';
      if (!data.IsRyuuKyoku) {
        // 局中时只显示自己手牌
        if (dir === 'east') {
          let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
          const getValue = c => (c.Value === 0 ? 5 : c.Value);
          if (data.DisabledCards && data.DisabledCards.some(c => c.Type === card.Type && getValue(c) === getValue(card)))
            // 如果是被禁止打出的牌，则添加灰色遮罩
            tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"'
              + ' data-card-index="' + idx + '" data-card-type="hand">' + cardImg + '<div class="disabled-mask"></div></span>');
          else
            tileContainer.append('<span class="mj-card selectable-card" style="position:absolute;cursor:pointer;' + posStyle + '"'
              + ' data-card-index="' + idx + '" data-card-type="hand">' + cardImg + '</span>');
        }
        else {
          // 若为透明牌则显示
          if (card.Transparent) {
            let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
            tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '">' + cardImg + '</span>');
          }
          else
            tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"><img class="mj-back" src="img/Back.svg"></span>');
        }
      }
      else {
        // 流局时显示听牌玩家手牌
        if (player.IsTenPai || dir === 'east') {
          let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
          tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '">' + cardImg + '</span>');
        } else {
          tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"><img class="mj-back" src="img/Back.svg"></span>');
        }
      }
      leftBound += 38;
    }

    // 渲染摸牌
    if (player.DrawCard) {
      leftBound += 12;
      let posStyle = 'left:' + leftBound + 'px;top:' + upperBound + 'px;';
      if (dir === 'east') {
        let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(player.DrawCard) + '">';
        const getValue = c => (c.Value === 0 ? 5 : c.Value);
        if (data.DisabledCards && data.DisabledCards.some(c => c.Type === player.DrawCard.Type && getValue(c) === getValue(player.DrawCard)))
          // 如果是被禁止打出的牌，则添加灰色遮罩
          tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"'
            + ' data-card-index="13" data-card-type="draw">' + cardImg + '<div class="disabled-mask"></div></span>');
        else
          tileContainer.append('<span class="mj-card selectable-card" style="position:absolute;cursor:pointer;' + posStyle + '"'
            + ' data-card-index="13" data-card-type="draw">' + cardImg + '</span>');
      } else {
        if (player.DrawCard.Transparent) {
          let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(player.DrawCard) + '">';
          tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '">' + cardImg + '</span>');
        }
        else
          tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"><img class="mj-back" src="img/Back.svg"></span>');
      }
      leftBound += 38;
    }

    // 渲染副露牌
    if (Array.isArray(player.ShowCards) && player.ShowCards.length > 0) {
      for (let meldIdx = 0; meldIdx < player.ShowCards.length; meldIdx++) {
        let meld = player.ShowCards[meldIdx];
        // 副露从右向左渲染
        for (let cardIdx = meld.Cards.length - 1; cardIdx >= 0; cardIdx--) {
          let card = meld.Cards[cardIdx];
          let posStyle = '';
          if (meld.Turn && meld.Turn[cardIdx]) {
            posStyle = 'left:' + rightBound + 'px;top:' + upperBound + 'px;transform:rotate(270deg);transform-origin:left bottom;';
            if (meld.Type === 'Kakan') {
              let zeroNum = meld.Cards.filter(c => c.Value === 0 && (c.Type == 's' || c.Type == 'p' || c.Type == 'm')).length;
              let fiveNum = meld.Cards.filter(c => c.Value === 5 && (c.Type == 's' || c.Type == 'p' || c.Type == 'm')).length;
              let transparentNum = meld.Cards.filter(c => c.Transparent).length;
              let KakanCard = { Value: card.Value, Type: card.Type, Transparent: false };
              if (zeroNum === 1 && fiveNum === 2) {
                KakanCard.Value = 5;
              }
              else if (fiveNum === 3) {
                KakanCard.Value = 0;
              }
              if (transparentNum === 2) {
                KakanCard.Transparent = true;
              }
              let kakanPosStyle = 'left:' + rightBound + 'px;top:' + (upperBound - 38) + 'px;transform:rotate(270deg);transform-origin:left bottom;';
              let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(KakanCard) + '">';
              tileContainer.append('<span class="mj-card" style="position:absolute;' + kakanPosStyle + '">' + cardImg + '</span>');
            }
            rightBound -= 52;
          }
          else {
            posStyle = 'left:' + (rightBound - 38) + 'px;top:' + upperBound + 'px;';
            rightBound -= 38;
          }
          if (meld.Closed && meld.Closed[cardIdx]) {
            tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"><img class="mj-back" src="img/Back.svg"></span>');
          }
          else {
            let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
            tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '">' + cardImg + '</span>');
          }
        }
      }
    }

    // 渲染按钮区（只在自己）
    if (dir === 'east') {
      if (players[0].Status === 'WaitingSelect' && Array.isArray(players[0].Options)) {
        const getValue = c => (c.Value === 0 ? 5 : c.Value);
        const isSameCard = (a, b) => a.Type === b.Type && getValue(a) === getValue(b);
        players[0].Options.forEach(function (cardGroup, idx) {
          const pos = positions.east.buttonRow[idx];
          if (!pos) return;
          const posStyle = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
          let innerHtml = '<span>';
          if (cardGroup.length === 1) {
            innerHtml += '<img src="' + GetCardImgSrc(cardGroup[0]) + '">'
            innerHtml += '杠';
          }
          else if (cardGroup.length === 2) {
            innerHtml += cardGroup.map(c => '<img src="' + GetCardImgSrc(c) + '">').join('');
            if (isSameCard(cardGroup[0], cardGroup[1])) innerHtml += '碰';
            else innerHtml += '吃';
          }
          mainContent.append(
            '<button class="game-action-btn-select" data-idx="' + idx + '"' + ' style="' + posStyle + '">'
            + innerHtml + '</button>'
          );
        });
      } else {
        const optionMap = {
          'Chi': { label: 'Chi', icon: 'img/Chi.svg' },
          'Pon': { label: 'Pon', icon: 'img/Pon.svg' },
          'Kan': { label: 'Kan', icon: 'img/Kan.svg' },
          'Riichi': { label: 'Riichi', icon: 'img/Riichi.svg' },
          'Pass': { label: 'Pass', icon: 'img/Pass.svg' },
          'Ron': { label: 'Ron', icon: 'img/Ron.svg' },
          'Tsumo': { label: 'Tsumo', icon: 'img/Tsumo.svg' }
        };
        // 只显示Options里的操作
        (players[0].Options || []).slice(0, 5).forEach(function (opt, idx) {
          const info = optionMap[opt] || { label: opt, icon: '' };
          const pos = positions.east.buttonRow[idx];
          if (!pos) return;
          mainContent.append(
            '<img class="game-action-btn" data-action="' + opt + '"'
            + ' src="' + info.icon + '"'
            + ' alt="' + info.label + '"'
            + ' style="position:absolute;left:' + pos.left + 'px;top:' + pos.top + 'px;width:60px;height:45px;z-index:200;cursor:pointer;">'
          );
        });
      }
    }

    // 渲染操作提示
    if (player.ActiveAction && player.ActiveAction !== '') {
      const actionTextMap = {
        'Chi': '吃',
        'Pon': '碰',
        'Kan': '杠',
        'Riichi': '立直',
        'Ron': '和',
        'Tsumo': '自摸',
      }
      const actionHtml = '<div class="action-hint">' + actionTextMap[player.ActiveAction] + '</div>';
      tileContainer.append(actionHtml);

      if (idx === 0)
        playSound(player.ActiveAction);
    }
  });

  // 按钮点击选中功能
  $('.game-action-btn').off('click').on('click', function () {
    const action = $(this).data('action');
    // 点击后立即隐藏所有操作按钮
    $('.game-action-btn').hide();
    socket.emit('playerAction', { Action: action });
  });

  // 麻将牌鼠标移入高亮
  $('.selectable-card').off('mouseenter').on('mouseenter', function () {
    // 移除其他牌的选中状态
    $('.selectable-card').removeClass('selected');
    // 添加当前牌的选中状态
    $(this).addClass('selected');
  });

  // 麻将牌点击选中功能
  $('.selectable-card').off('click').on('click', function () {
    // 获取牌的信息
    const cardIndex = $(this).data('card-index');
    const cardType = $(this).data('card-type');
    let cardValue = cardType === 'hand' ? players[0].HandCards[cardIndex] : players[0].DrawCard;
    socket.emit('selectCard', { Card: cardValue, Type: cardType });
    console.log('选中牌:', cardType, cardIndex, cardValue);
  });

  // 右键摸切功能
  mainContent.off('contextmenu').on('contextmenu', function (e) {
    e.preventDefault(); // 阻止默认右键菜单
    const card = players[0].DrawCard;
    const getValue = c => (c.Value === 0 ? 5 : c.Value);
    if (card && !data.DisabledCards.some(c => c.Type === card.Type && getValue(c) === getValue(card))) {
      // 发送摸切请求到服务器
      socket.emit('selectCard', { Card: card, Type: 'draw' });
      console.log('摸切牌:', card);
    }
  });

  // 绑定点击事件
  $('.game-action-btn-select').off('click').on('click', function () {
    const idx = $(this).data('idx');
    const cardGroup = players[0].Options[idx];
    const getValue = c => (c.Value === 0 ? 5 : c.Value);
    const isSameCard = (a, b) => a.Type === b.Type && getValue(a) === getValue(b);
    if (cardGroup.length === 1) {
      // 杠
      socket.emit('finalKan', { kanCard: cardGroup[0] });
    }
    else if (cardGroup.length === 2) {
      if (isSameCard(cardGroup[0], cardGroup[1])) {
        // 碰
        socket.emit('finalPon', { poncard1: cardGroup[0], poncard2: cardGroup[1] });
      } else {
        // 吃
        socket.emit('finalChi', { chiCard1: cardGroup[0], chiCard2: cardGroup[1] });
      }
    }
  });
});

// 共享的渲染函数
const renderHandCards = (cards) => {
  if (!cards || cards.length === 0) return '';
  return cards.map(card =>
    `<img src="img/${card.Value}${card.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`
  ).join('');
};

const renderShowCards = (showCards) => {
  if (!showCards || showCards.length === 0) return '';
  let html = '';
  // 从右向左渲染，与主游戏桌面保持一致
  for (let showIdx = showCards.length - 1; showIdx >= 0; showIdx--) {
    let show = showCards[showIdx];
    if (show.Cards && show.Cards.length > 0) {
      // 从左向右渲染，与主游戏桌面保持一致
      for (let cardIdx = 0; cardIdx < show.Cards.length; cardIdx++) {
        let card = show.Cards[cardIdx];
        if (show.Closed && show.Closed[cardIdx]) {
          html += `<img src="img/Back.svg" style="width: 38px; height: 52px; margin: 0px;">`;
        } else {
          html += `<img src="img/${card.Value}${card.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`;
        }
      }
      if (show.Type === 'Kakan') {
        // 如果是加杠，则显示加杠牌
        let fiveNum = show.Cards.filter(c => c.Value === 5 && (c.Type == 's' || c.Type == 'p' || c.Type == 'm')).length;
        let zeroNum = show.Cards.filter(c => c.Value === 0 && (c.Type == 's' || c.Type == 'p' || c.Type == 'm')).length;
        let kakanCard = { Value: show.Cards[0].Value, Type: show.Cards[0].Type };
        if (zeroNum === 1 && fiveNum === 2)
          kakanCard.Value = 5; // 如果是0,5,5的加杠牌，则显示5
        else if (fiveNum === 3)
          kakanCard.Value = 0; // 如果是5,5,5的加杠牌，则显示0
        html += `<img src="img/${kakanCard.Value}${kakanCard.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`;
      }
    }
  }
  return html;
};

const renderDoraIndicators = (doraIndicators) => {
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (doraIndicators && doraIndicators[i])
      html += `<img src="img/${doraIndicators[i].Value}${doraIndicators[i].Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`;
    else html += `<img src="img/Back.svg" style="width: 38px; height: 52px; margin: 0px;">`;
  }
  return html;
};

const doraTypeMap = {
  Dora: '表宝牌',
  RedDora: '红宝牌',
  LiDora: '里宝牌'
};

const renderPointsBoard = (data) => {
  const myPos = data.position;
  const players = data.players.slice().sort((a, b) => ((a.Position - myPos + 4) % 4) - ((b.Position - myPos + 4) % 4));
  const windNames = ['东', '南', '西', '北'];
  const classNames = ['east', 'south', 'west', 'north'];
  let html = '';
  for (let i = 0; i < 4; i++) {
    const windIdx = (data.position + i) % 4;
    const wind = windNames[windIdx];
    const className = classNames[i];
    html += `<div class='player-board ${className}'>`;
    html += `<div><span>${wind} ${players[i].UserName}</span></div>`;
    html += `<div><span>${players[i].Points}</span>`;
    if (players[i].PointsChange > 0)
      html += `<span style='color: red;'> +${players[i].PointsChange}</span>`;
    else if (players[i].PointsChange < 0)
      html += `<span style='color: blue;'> ${players[i].PointsChange}</span>`;
    html += '</div></div>';
  }
  return html;
}

// 共享的显示结果函数
const showWinResult = (data, isTsumo) => {
  // 合并役种和宝牌
  let yakuList = [];
  if (data.yaku) {
    yakuList = Object.entries(data.yaku).map(([key, info]) =>
      `${info.name} ${info.fan}番`
    );
  }
  if (data.dora && Array.isArray(data.dora)) {
    // 合并相同类型的宝牌
    const doraCounts = {};
    data.dora
      .filter(d => d.count > 0)
      .forEach(d => {
        const type = doraTypeMap[d.type] || d.type;
        doraCounts[type] = (doraCounts[type] || 0) + d.count;
      });

    // 将合并后的宝牌添加到役种列表
    Object.entries(doraCounts).forEach(([type, count]) => {
      yakuList.push(`${type} ${count}番`);
    });
  }
  const yakuHtml = yakuList.length
    ? yakuList.map(line => `<p style="margin: 5px 0;"><strong>${line}</strong></p>`).join('')
    : '<p>无役种信息</p>';

  // 确定标题和和牌信息
  const title = isTsumo ? `${data.playerName} 自摸` : `${data.playerName1} 荣和 ${data.playerName2}`;
  const winCard = isTsumo ? data.tsumoCard : data.ronCard;
  const modalId = isTsumo ? 'tsumoResultModal' : 'ronResultModal';

  // 创建悬浮窗口
  const modalHtml = `
    <div id="${modalId}" class="game-modal">
      <div class="game-modal-content">
        <h4>${title}</h4>
        <div style="margin: 20px 0;">
          <div style="margin-bottom: 15px;">
            <div style="margin: 5px 0;">
              ${renderHandCards(data.handCards)}
              <span style="margin: 0 12px;"></span>
              <img src="img/${winCard.Value}${winCard.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">
              <span style="margin: 0 12px;"></span>
              ${renderShowCards(data.showCards)}
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <div style="margin: 5px 0;">
              ${renderDoraIndicators(data.doraIndicators)}<span style="margin: 0 20px;"></span>${renderDoraIndicators(data.liDoraIndicators)}
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <h5>役种详情:</h5>
            <div style="max-height: 200px; overflow-y: auto;">
              ${yakuHtml}
            </div>
          </div>
          <p><strong>番数:</strong> ${data.fan} 番</p>
          <p><strong>符数:</strong> ${data.fu} 符</p>
          <p><strong>点数:</strong> ${data.point} 点</p>
          <div class="points-board"></div>
        </div>
      </div>
    </div>
  `;

  // 添加到页面
  $('body').append(modalHtml);

  // 渲染玩家点数板
  $('.points-board').html(renderPointsBoard(data));

  // 10秒后自动关闭
  setTimeout(() => {
    $(`#${modalId}`).fadeOut(500, function () {
      $(this).remove();
    });
  }, 10000);
};

// 处理荣和结果显示
socket.on('showRonResult', function (data) {
  showWinResult(data, false);
});

// 处理自摸结果显示
socket.on('showTsumoResult', function (data) {
  showWinResult(data, true);
});

// 处理流局结果显示
socket.on('showRyuuKyokuResult', function (data) {
  const modalId = 'RyuuKyokuResultModal';
  const modalHtml = `
    <div id="${modalId}" class="game-modal">
      <div class="game-modal-content">
        <h4>流局</h4>
        <div style="margin: 20px 0;">
          <div class="points-board"></div>
        </div>
      </div>
    </div>
  `;
  $('body').append(modalHtml);

  // 渲染玩家点数板
  $('.points-board').html(renderPointsBoard(data));

  setTimeout(() => {
    $(`#${modalId}`).fadeOut(500, function () {
      $(this).remove();
    });
  }, 5000);
});

// 处理终局结果显示
socket.on('showEndGameResult', function (data) {
  const modalId = 'endGameResultModal';
  const modalHtml = `
    <div id="${modalId}" class="game-modal">
      <div class="game-modal-content">
        <h4>终局</h4>
        <div style="margin: 20px 0;">
          <div style="margin-bottom: 15px;">
            <div style="margin: 5px 0;">
              1位: ${data.playerName1} (${data.playerPoints1}点)
              <span style="margin: 0 20px;">&nbsp;</span>
              2位: ${data.playerName2} (${data.playerPoints2}点)
              <span style="margin: 0 20px;">&nbsp;</span>
              3位: ${data.playerName3} (${data.playerPoints3}点)
              <span style="margin: 0 20px;">&nbsp;</span>
              4位: ${data.playerName4} (${data.playerPoints4}点)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  $('body').append(modalHtml);
  // 30秒后返回首页，并关闭弹窗和游戏界面
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 30000);
});

// 带控制的播放音效函数
function playSound(soundName) {
  if (window.gameSounds && window.gameSounds[soundName]) {
    try {
      // 检查是否应该播放音效（可以添加设置选项）
      const shouldPlaySound = localStorage.getItem('soundEnabled') !== 'false';
      if (!shouldPlaySound) return;

      // 重置音频到开头
      window.gameSounds[soundName].currentTime = 0;
      // 设置音量
      window.gameSounds[soundName].volume = 0.7;
      // 播放音频
      window.gameSounds[soundName].play();
    } catch (error) {
      console.log('音效播放失败:', error);
    }
  }
}

// 可选：添加音效开关功能
function toggleSound() {
  const isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  localStorage.setItem('soundEnabled', !isSoundEnabled);
}