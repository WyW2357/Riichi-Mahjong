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
      $('#playersNames').html(data.Players.map(function (p) { return '<span>' + p + '</span><br />';}));
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
      if(data.ERROR == 1) {
        $('#joinModal').closeModal();
        Materialize.toast("游戏已在进行中", 4000);
      }
      else{
        // 显示当前房间中的玩家列表
        $('#joinModalContent').html('<h5>房间号:</h5><code>' + data.Code + '</code><br /><h5>当前在房间中的玩家:</h5>');
        $('#playersNames2').html(data.Players.map(function (p) { return '<span>' + p + '</span><br />';}));
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
  if (card.Value === 0) {
    if (card.Type === 'm') return 'img/Man5-Dora.svg';
    if (card.Type === 'p') return 'img/Pin5-Dora.svg';
    if (card.Type === 's') return 'img/Sou5-Dora.svg';
  }
  if (card.Type === 'm') return 'img/Man' + card.Value + '.svg';
  if (card.Type === 'p') return 'img/Pin' + card.Value + '.svg';
  if (card.Type === 's') return 'img/Sou' + card.Value + '.svg';
  if (card.Type === 'z') {
    var zMap = { 1: 'Ton', 2: 'Nan', 3: 'Shaa', 4: 'Pei', 5: 'Haku', 6: 'Hatsu', 7: 'Chun' };
    return 'img/' + zMap[card.Value] + '.svg';
  }
  return '';
}

// 绝对定位麻将牌布局
const CARD_WIDTH = 32, CARD_HEIGHT = 42, GAP = 6, DRAW_GAP = 18;
const TABLE_SIZE = 850;
const HAND_Y = 850 - 60;
const RIVER_Y = 850 - 270;
const HAND_X_START = (TABLE_SIZE - (14 * CARD_WIDTH + 13 * GAP)) / 2;
const RIVER_X_START = (TABLE_SIZE - (6 * CARD_WIDTH + 5 * GAP)) / 2;

function rotate(x, y, deg) {
  const cx = TABLE_SIZE / 2, cy = TABLE_SIZE / 2;
  const rad = deg * Math.PI / 180;
  const dx = x - cx, dy = y - cy;
  return {
    left: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    top: cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  };
}

const positions = {
  east: {
    hand: Array.from({length: 13}, (_, i) => ({
      left: HAND_X_START + i * (CARD_WIDTH + GAP),
      top: HAND_Y
    })),
    draw: {
      left: HAND_X_START + 13 * (CARD_WIDTH + GAP) + DRAW_GAP,
      top: HAND_Y
    },
    river: Array.from({length: 35}, (_, i) => ({
      left: RIVER_X_START + (i % 6) * (CARD_WIDTH + GAP),
      top: RIVER_Y + Math.floor(i / 6) * (CARD_HEIGHT + GAP)
    }))
  },
  south: {}, west: {}, north: {}
};
// 生成南家（右）、西家（上）、北家（左）坐标
for (let i = 0; i < 13; i++) {
  // hand
  let p = positions.east.hand[i];
  positions.south.hand = positions.south.hand || [];
  positions.west.hand = positions.west.hand || [];
  positions.north.hand = positions.north.hand || [];
  positions.south.hand[i] = rotate(p.left, p.top, 90);
  positions.west.hand[i] = rotate(p.left, p.top, 180);
  positions.north.hand[i] = rotate(p.left, p.top, 270);
}
// draw
let pDraw = positions.east.draw;
positions.south.draw = rotate(pDraw.left, pDraw.top, 90);
positions.west.draw = rotate(pDraw.left, pDraw.top, 180);
positions.north.draw = rotate(pDraw.left, pDraw.top, 270);
for (let i = 0; i < 35; i++) {
  // river
  let p = positions.east.river[i];
  positions.south.river = positions.south.river || [];
  positions.west.river = positions.west.river || [];
  positions.north.river = positions.north.river || [];
  positions.south.river[i] = rotate(p.left, p.top, 90);
  positions.west.river[i] = rotate(p.left, p.top, 180);
  positions.north.river[i] = rotate(p.left, p.top, 270);
}

const pos2dir = ['east', 'south', 'west', 'north'];

socket.on('rerender', function (data) {
  $('#gameDiv').html(''); // 清空桌面
  // 渲染牌山（MainCards）
  if (data.MainCards && Array.isArray(data.MainCards)) {
    var mainLen = data.MainCards.length;
    var mainRow = 5;
    var mainRows = [];
    for (var i = 0; i < mainLen; i += mainRow) {
      var row = data.MainCards.slice(i, i + mainRow).map(function(card) {
        if (!card || Object.keys(card).length === 0) {
          // 空对象用牌背
          return '<span class="mj-card"><img class="mj-back" src="img/Back.svg"></span>';
        } else {
          var back = '<img class="mj-back" src="img/Front.svg">';
          var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
          return '<span class="mj-card">' + back + front + '</span>';
        }
      }).join('');
      mainRows.push('<div class="maincards-row">' + row + '</div>');
    }
    // 居中显示
    var mainStyle = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;';
    $('#gameDiv').append('<div id="maincards" style="' + mainStyle + '">' + mainRows.join('') + '</div>');

    // 牌山下方只显示局数、本场
    var stageStr = '';
    if (data.StageNum <= 4) stageStr = '东' + data.StageNum + '局';
    else if (data.StageNum <= 8) stageStr = '南' + (data.StageNum-4) + '局';
    var roundStr = data.RoundNum !== undefined ? (data.RoundNum + '本场') : '';
    var infoHtml = '<div style="text-align:center;margin-top:12px;font-size:1.2em;">' + stageStr + ' ' + roundStr + '</div>';
    $('#gameDiv').append('<div id="tableinfo" style="position:absolute;left:50%;top:calc(50% + 80px);transform:translateX(-50%);z-index:21;width:100%;">' + infoHtml + '</div>');

    // 渲染四个方位label在桌布上下左右中央
    const CENTER = 850 / 2;
    const OUT_OFFSET = 30; // label超出桌布的距离，可根据需要调整
    $('#gameDiv').append('<span class="pos-label" style="position:absolute;left:' + (CENTER - 18) + 'px;top:-' + OUT_OFFSET + 'px;z-index:30;font-size:1.3em;color:#222;background:#fff3;border-radius:6px;padding:2px 10px;">西</span>');
    $('#gameDiv').append('<span class="pos-label" style="position:absolute;left:' + (CENTER - 18) + 'px;bottom:-' + OUT_OFFSET + 'px;z-index:30;font-size:1.3em;color:#222;background:#fff3;border-radius:6px;padding:2px 10px;">东</span>');
    $('#gameDiv').append('<span class="pos-label" style="position:absolute;left:-' + OUT_OFFSET + 'px;top:' + (CENTER - 18) + 'px;z-index:30;font-size:1.3em;color:#222;background:#fff3;border-radius:6px;padding:2px 10px;">北</span>');
    $('#gameDiv').append('<span class="pos-label" style="position:absolute;right:-' + OUT_OFFSET + 'px;top:' + (CENTER - 18) + 'px;z-index:30;font-size:1.3em;color:#222;background:#fff3;border-radius:6px;padding:2px 10px;">南</span>');
  }
  data.Players.forEach(function(player) {
    var dir = pos2dir[player.Position];
    // 渲染手牌
    player.HandCards.forEach(function(card, idx) {
      var pos = positions[dir].hand[idx];
      var back = '<img class="mj-back" src="img/Front.svg">';
      var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
      var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
      $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '">' + back + front + '</span>');
    });
    // 渲染DrawCard（摸牌）
    if (player.DrawCard && positions[dir].draw) {
      var pos = positions[dir].draw;
      var back = '<img class="mj-back" src="img/Front.svg">';
      var front = '<img class="mj-front" src="' + GetCardImgSrc(player.DrawCard) + '">';
      var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
      $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '">' + back + front + '</span>');
    }
    // 渲染河牌
    (player.RiverCards || []).forEach(function(card, idx) {
      var pos = positions[dir].river[idx];
      var back = '<img class="mj-back" src="img/Front.svg">';
      var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
      var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
      $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '">' + back + front + '</span>');
    });
  });
});