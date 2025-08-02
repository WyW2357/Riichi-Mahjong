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
  $('#gameDiv').append('<div id="maincards" class="main-cards">' + mainCardsHtml + '</div>');

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

  // 以自己为下方旋转Players数组
  const myPos = data.Position;
  const players = data.Players.slice().sort((a, b) => ((a.Position - myPos + 4) % 4) - ((b.Position - myPos + 4) % 4));
  const pos2dir = ['east', 'south', 'west', 'north'];
  players.forEach(function (player, idx) {
    var dir = pos2dir[idx]; // idx=0:自己, 1:下家, 2:对家, 3:上家
    // 渲染立直棒
    if (player.IsRiichi) {
      $('#gameDiv').append('<img src="img/RiichiBou.svg" class="riichibou ' + dir + '">');
    }
    // 渲染点数
    $('#gameDiv').append('<div class="points ' + dir + '">' + player.Points + '</div>');

    // 创建tile-container
    $('#gameDiv').append('<div class="tile-container ' + dir + '"></div>');
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
                let cardImg = '<img class="mj-front" src="' + GetCardImgSrc({ Value: 5, Type: card.Type }) + '">';
                tileContainer.append('<span class="mj-card" style="position:absolute;' + kakanPosStyle + '">' + cardImg + '</span>');
              }
              else if (fiveNum === 3) {
                let kakanPosStyle = 'left:' + rightBound + 'px;top:' + (upperBound - 38) + 'px;transform:rotate(270deg);transform-origin:left bottom;';
                let cardImg = '<img class="mj-front" src="' + GetCardImgSrc({ Value: 0, Type: card.Type }) + '">';
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
        players[0].Options.forEach(function (cardGroup, idx) {
          const pos = positions.east.buttonRow[idx];
          if (!pos) return;
          let label = '';
          if (cardGroup.length === 1) {
            label += cardGroup[0].Value + cardGroup[0].Type;
            label += '杠';
          }
          else if (cardGroup.length === 2) {
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
        // 明杠特殊处理逻辑
        if (show.Type === 'Kakan') {
          let zeroNum = show.Cards.filter(c => c.Value === 0 && (c.Type == 's' || c.Type == 'p' || c.Type == 'm')).length;
          let fiveNum = show.Cards.filter(c => c.Value === 5 && (c.Type == 's' || c.Type == 'p' || c.Type == 'm')).length;
          if (zeroNum === 1 && fiveNum === 2) {
            // 显示5
            html += `<img src="img/5${card.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`;
          } else if (fiveNum === 3) {
            // 显示0
            html += `<img src="img/0${card.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`;
          } else {
            // 正常显示
            html += `<img src="img/${card.Value}${card.Type}.svg" style="width: 38px; height: 52px; margin: 0px;">`;
          }
        } else {
          if (show.Closed && show.Closed[cardIdx]) {
            html += `<img src="img/Back.svg" style="width: 38px; height: 52px; margin: 0px;">`;
          } else {
            const cardStyle = 'width: 38px; height: 52px; margin: 0px;';
            html += `<img src="img/${card.Value}${card.Type}.svg" style="${cardStyle}">`;
          }
        }
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

  // 寻找各玩家的方位和id
  const myPos = data.position;
  const players = data.players.slice().sort((a, b) => ((a.Position - myPos + 4) % 4) - ((b.Position - myPos + 4) % 4));
  const windNames = ['东', '南', '西', '北'];
  const classNames = ['east', 'south', 'west', 'north'];
  for (let i = 0; i < 4; i++) {
    const windIdx = (data.position + i) % 4;
    const wind = windNames[windIdx];
    const className = classNames[i];
    $('.points-board').append("<div class='player-board " + className + "'></div>");
    const windAndId = `${wind} ${players[i].UserName}`;
    $('.player-board.' + className).append('<div><span>' + windAndId + '</span></div>');
    $('.player-board.' + className).append('<div id="points-' + className + '"><span>' + players[i].Points + '</span></div>');
    if (players[i].PointsChange > 0)
      $('#points-' + className).append('<span style="color: red;"> +' + players[i].PointsChange + '</span>');
    else if (players[i].PointsChange < 0)
      $('#points-' + className).append('<span style="color: blue;"> ' + players[i].PointsChange + '</span>');
  }

  // 5秒后自动关闭
  // setTimeout(() => {
  //   $(`#${modalId}`).fadeOut(500, function () {
  //     $(this).remove();
  //   });
  // }, 5000);
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
socket.on('showRyuukyokuResult', function (data) {
  const modalId = 'RyuukyokuResultModal';
  const modalHtml = `
    <div id="${modalId}" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
      <div class="modal-content" style="background-color: rgba(254,254,254,0.8); margin: 3% auto; padding: 30px; border: 1px solid #888; width: 90%; max-width: 800px; border-radius: 8px; max-height: 85vh; overflow-y: auto;">
        <h4 style="color: #d32f2f; text-align: center;">流局</h4>
        <div style="margin: 20px 0;">
          <div style="margin-bottom: 15px;">
            <div style="margin: 5px 0;">
              ${data.playerName1} (${data.playerPointsChange1}点)
              <span style="margin: 0 20px;">&nbsp;</span>
              ${data.playerName2} (${data.playerPointsChange2}点)
              <span style="margin: 0 20px;">&nbsp;</span>
              ${data.playerName3} (${data.playerPointsChange3}点)
              <span style="margin: 0 20px;">&nbsp;</span>
              ${data.playerName4} (${data.playerPointsChange4}点)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  $('body').append(modalHtml);
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
    <div id="${modalId}" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
      <div class="modal-content" style="background-color: rgba(254,254,254,0.8); margin: 3% auto; padding: 30px; border: 1px solid #888; width: 90%; max-width: 800px; border-radius: 8px; max-height: 85vh; overflow-y: auto;">
        <h4 style="color: #d32f2f; text-align: center;">终局</h4>
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