// 页面加载完成后的初始化工作
$(document).ready(function () {
  // 初始化时隐藏游戏界面，等待用户操作
  $('#gameDiv').hide();
  // 初始化模态框（弹出窗口）功能，用于显示各种弹窗，如：用户名输入框、游戏规则说明等
  $('.modal-trigger').leanModal();
  // 初始化工具提示功能，设置延迟时间为50毫秒，当鼠标悬停在带有 tooltipped 类的元素上时，会显示提示信息
  $('.tooltipped').tooltip({ delay: 50 });
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
  return 'img/' + card.Value + card.Type + '.svg';
}

const positions = {
  east: {
    // 新增按钮区（第四行）
    buttonRow: Array.from({ length: 5 }, (_, i) => ({
      left: 328 + i * 80 + 80,
      top: 616 + 156
    }))
  }
};

socket.on('rerender', function (data) {
  $('#gameDiv').html(''); // 清空桌面

  // 渲染牌桌中心部分
  $('#gameDiv').append('<div class="main-board"></div>')
  // 渲染牌山（MainCards）
  if (data.MainCards && Array.isArray(data.MainCards)) {
    var mainRows = [];
    var row = data.MainCards.slice().map(function (card) {
      if (!card || Object.keys(card).length === 0)
        return '<span class="mj-card"><img class="mj-back" src="img/Back.svg"></span>';
      else
        return '<span class="mj-card"><img class="mj-front" src="' + GetCardImgSrc(card) + '"></span>';
    }).join('');
    mainRows.push(row);
    $('#gameDiv').append('<div id="maincards" class="main-cards">' + mainRows.join('') + '</div>');

    // 牌山下方只显示局数、本场
    var stageStr = '';
    if (data.StageNum <= 4) stageStr = '东' + data.StageNum + '局';
    else if (data.StageNum <= 8) stageStr = '南' + (data.StageNum - 4) + '局';
    var roundStr = data.RoundNum !== undefined ? (data.RoundNum + '本场') : '';
    var infoHtml = '<div class="text">' + stageStr + ' ' + roundStr + '</div>';
    $('#gameDiv').append('<div id="tableinfo" class="table-info">' + infoHtml + '</div>');

    // 牌山下方50px处显示余牌数
    if (typeof data.RestCardsNum === 'number') {
      $('#gameDiv').append('<div id="restcards-info" class="rest-cards-info">余 ' + data.RestCardsNum + '</div>');
    }

    // 牌山上方显示立直棒图标+数量（0也显示）
    if (typeof data.RiichiBang !== 'undefined') {
      $('#gameDiv').append('<div id="riichibou-info" class="riichibou-info">'
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
      const redStyle = (windIdx === 0) ? ' style="color:#d22;"' : '';
      $('#gameDiv').append('<span class="wind-label ' + className + '"' + redStyle + '>' + wind + '</span>');
    }
  }
  // 以自己为下方旋转Players数组
  const myPos = data.Position;
  const players = data.Players.slice().sort((a, b) => ((a.Position - myPos + 4) % 4) - ((b.Position - myPos + 4) % 4));
  const pos2dir = ['east', 'south', 'west', 'north'];
  players.forEach(function (player, idx) {
    var dir = pos2dir[idx]; // idx=0:自己, 1:下家, 2:对家, 3:上家
    // 渲染立直棒
    if (player.Status === 'Riichi') {
      $('#gameDiv').append('<img src="img/RiichiBou.svg" class="riichibou ' + dir + '">');
    }
    // 渲染点数
    $('#gameDiv').append('<div class="points ' + dir + '">' + player.Points + '</div>');

    // 创建tile-container
    $('#gameDiv').append('<div class="tile-container ' + dir + '"></div>');
    let tileContainer = $('#gameDiv .tile-container.' + dir);
    let leftBound = 120, rightBound = 882, houLeftBound = 332;
    let upperBound = 830, houUpperBound = 608;

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

    // 渲染手牌
    for (let idx = 0; idx < player.HandCards.length; idx++) {
      let card = player.HandCards[idx];
      let posStyle = 'left:' + leftBound + 'px;top:' + upperBound + 'px;';
      if (dir === 'east') {
        let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
        tileContainer.append('<span class="mj-card selectable-card" style="position:absolute;cursor:pointer;' + posStyle + '"'
          + ' data-card-index="' + idx + '" data-card-type="hand">'
          + cardImg + '</span>');
      }
      else {
        tileContainer.append('<span class="mj-card" style="position:absolute;' + posStyle + '"><img class="mj-back" src="img/Back.svg"></span>');
      }
      leftBound += 38;
    }

    // 渲染摸牌
    if (player.DrawCard) {
      leftBound += 12;
      let posStyle = 'left:' + leftBound + 'px;top:' + upperBound + 'px;';
      if (dir === 'east') {
        let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(player.DrawCard) + '">';
        tileContainer.append('<span id="draw-card" class="mj-card selectable-card" style="position:absolute;cursor:pointer;' + posStyle + '"'
          + ' data-card-type="draw" data-card-index="13">'
          + cardImg + '</span>');
      } else {
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
              if (zeroNum === 1 && fiveNum === 2) {
                let kakanPosStyle = 'left:' + rightBound + 'px;top:' + (upperBound - 38) + 'px;transform:rotate(270deg);transform-origin:left bottom;';
                let cardImg = '<img class="mj-front" src="' + GetCardImgSrc({Value:5,Type:card.Type}) + '">';
                tileContainer.append('<span class="mj-card" style="position:absolute;' + kakanPosStyle + '">' + cardImg + '</span>');
              }
              else if(fiveNum === 3) {
                let kakanPosStyle = 'left:' + rightBound + 'px;top:' + (upperBound - 38) + 'px;transform:rotate(270deg);transform-origin:left bottom;';
                let cardImg = '<img class="mj-front" src="' + GetCardImgSrc({Value:0,Type:card.Type}) + '">';
                tileContainer.append('<span class="mj-card" style="position:absolute;' + kakanPosStyle + '">' + cardImg + '</span>');
              }
              else {
                let kakanPosStyle = 'left:' + rightBound + 'px;top:' + (upperBound - 38) + 'px;transform:rotate(270deg);transform-origin:left bottom;';
                let cardImg = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
                tileContainer.append('<span class="mj-card" style="position:absolute;' + kakanPosStyle + '">' + cardImg + '</span>');
              }
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
        players[0].Options.forEach(function(cardGroup, idx) {
          const pos = positions.east.buttonRow[idx];
          if (!pos) return;
          let label = '';
          if(cardGroup.length === 1) {
            label += cardGroup[0].Value + cardGroup[0].Type;
            label += '杠';
          }
          else if(cardGroup.length === 2) {
            label += cardGroup.map(c => (c.Value === 0 ? '0' : c.Value) + c.Type).join('');
            if (isSameCard(cardGroup[0], cardGroup[1])) label += '碰';
            else label += '吃';
          }
          $('#gameDiv').append(
            '<button class="game-action-btn-select" data-idx="' + idx + '"'
            + ' style="position:absolute;left:' + pos.left + 'px;top:' + pos.top + 'px;width:60px;height:45px;z-index:200;cursor:pointer;">'
            + label + '</button>'
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
          $('#gameDiv').append(
            '<img class="game-action-btn" data-action="' + opt + '"'
            + ' src="' + info.icon + '"'
            + ' alt="' + info.label + '"'
            + ' style="position:absolute;left:' + pos.left + 'px;top:' + pos.top + 'px;width:60px;height:45px;z-index:200;cursor:pointer;">'
          );
        });
      }
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

  // 绑定点击事件
  $('.game-action-btn-select').off('click').on('click', function() {
    const idx = $(this).data('idx');
    const cardGroup = players[0].Options[idx];
    const getValue = c => (c.Value === 0 ? 5 : c.Value);
    const isSameCard = (a, b) => a.Type === b.Type && getValue(a) === getValue(b);
    if(cardGroup.length === 1) {
      // 杠
      socket.emit('finalKan', { kanCard: cardGroup[0] });
    }
    else if(cardGroup.length === 2) {
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