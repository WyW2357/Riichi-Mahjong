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

const CARD_WIDTH = 36, CARD_HEIGHT = 48, GAP = 4;
const TABLE_SIZE = 892;

// hand区(边缘20px)
const handStep = CARD_WIDTH + GAP;
const handStartX = 68, handStartY = 824;
const handStartXSouth = 824, handStartYSouth = 824;
const handStartXWest = 824, handStartYWest = 68;
const handStartXNorth = 68, handStartYNorth = 68;

// river区
const riverCols = 6;
const riverStartX = 328, riverStartY = 616;
const riverStartXSouth = 616, riverStartYSouth = 564;
const riverStartXWest = 564, riverStartYWest = 276;
const riverStartXNorth = 276, riverStartYNorth = 328;

const positions = {
  east: {
    hand: Array.from({length: 19}, (_, i) => ({
      left: handStartX + i * handStep,
      top: handStartY
    })),
    river: (() => {
      const coords = [];
      // 第1行：6个格子 (0-5)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartX + i * 40,
          top: riverStartY
        });
      }
      // 第2行：6个格子 (6-11)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartX + i * 40,
          top: riverStartY + 52
        });
      }
      // 第3行：12个格子 (12-23)
      for (let i = 0; i < 12; i++) {
        coords.push({
          left: riverStartX + i * 40,
          top: riverStartY + 104
        });
      }
      return coords;
    })(),
    // 新增按钮区（第四行）
    buttonRow: Array.from({length: 5}, (_, i) => ({
      left: riverStartX + i * 80 + 80,
      top: riverStartY + 156
    }))
  },
  south: {
    hand: Array.from({length: 19}, (_, i) => ({
      left: handStartXSouth,
      top: handStartYSouth - i * handStep
    })),
    river: (() => {
      const coords = [];
      // 第1行：6个格子 (0-5)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartXSouth,
          top: riverStartYSouth - i * 40
        });
      }
      // 第2行：6个格子 (6-11)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartXSouth + 52,
          top: riverStartYSouth - i * 40
        });
      }
      // 第3行：12个格子 (12-23)
      for (let i = 0; i < 12; i++) {
        coords.push({
          left: riverStartXSouth + 104,
          top: riverStartYSouth - i * 40
        });
      }
      return coords;
    })()
  },
  west: {
    hand: Array.from({length: 19}, (_, i) => ({
      left: handStartXWest - i * handStep,
      top: handStartYWest
    })),
    river: (() => {
      const coords = [];
      // 第1行：6个格子 (0-5)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartXWest - i * 40,
          top: riverStartYWest
        });
      }
      // 第2行：6个格子 (6-11)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartXWest - i * 40,
          top: riverStartYWest - 52
        });
      }
      // 第3行：12个格子 (12-23)
      for (let i = 0; i < 12; i++) {
        coords.push({
          left: riverStartXWest - i * 40,
          top: riverStartYWest - 104
        });
      }
      return coords;
    })()
  },
  north: {
    hand: Array.from({length: 19}, (_, i) => ({
      left: handStartXNorth,
      top: handStartYNorth + i * handStep
    })),
    river: (() => {
      const coords = [];
      // 第1行：6个格子 (0-5)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartXNorth,
          top: riverStartYNorth + i * 40
        });
      }
      // 第2行：6个格子 (6-11)
      for (let i = 0; i < 6; i++) {
        coords.push({
          left: riverStartXNorth - 52,
          top: riverStartYNorth + i * 40
        });
      }
      // 第3行：12个格子 (12-23)
      for (let i = 0; i < 12; i++) {
        coords.push({
          left: riverStartXNorth - 104,
          top: riverStartYNorth + i * 40
        });
      }
      return coords;
    })()
  }
};

socket.on('rerender', function (data) {
  $('#gameDiv').html(''); // 清空桌面

  // 调试：标记所有hand点(有标号，红色)
  Object.keys(positions).forEach(function(dir) {
    if (positions[dir].hand) {
      positions[dir].hand.forEach(function(pos, idx) {
        $('#gameDiv').append(
          '<div style="position:absolute;left:' + (pos.left-4) + 'px;top:' + (pos.top-4) + 'px;width:8px;height:8px;border-radius:50%;background:#f00;z-index:100;font-size:10px;color:#fff;text-align:center;line-height:8px;opacity:0.7;">' + idx + '</div>'
        );
      });
    }
  });
  // 调试：标记所有river点(有标号，蓝色)
  Object.keys(positions).forEach(function(dir) {
    if (positions[dir].river) {
      positions[dir].river.forEach(function(pos, idx) {
        $('#gameDiv').append(
          '<div style="position:absolute;left:' + (pos.left-4) + 'px;top:' + (pos.top-4) + 'px;width:8px;height:8px;border-radius:50%;background:#00f;z-index:100;font-size:10px;color:#fff;text-align:center;line-height:8px;opacity:0.7;">' + idx + '</div>'
        );
      });
    }
  });
  // 调试：标记buttonRow点(绿色)
  if (positions.east && positions.east.buttonRow) {
    positions.east.buttonRow.forEach(function(pos, idx) {
      $('#gameDiv').append(
        '<div style="position:absolute;left:' + (pos.left-4) + 'px;top:' + (pos.top-4) + 'px;width:8px;height:8px;border-radius:50%;background:#0c0;z-index:101;font-size:10px;color:#fff;text-align:center;line-height:8px;opacity:0.7;">' + idx + '</div>'
      );
    });
  }
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
    $('#gameDiv').append('<div id="tableinfo" style="position:absolute;left:50%;top:calc(50% + 20px);transform:translateX(-50%);z-index:21;width:100%;">' + infoHtml + '</div>');

    // 牌山下方50px处显示余牌数
    if (typeof data.RestCardsNum === 'number') {
      $('#gameDiv').append('<div id="restcards-info" style="position:absolute;left:50%;top:calc(50% + 60px);transform:translateX(-50%);z-index:22;min-width:54px;text-align:center;font-size:1.15em;font-weight:bold;color:#2196F3;background:#fffbe8cc;border-radius:16px;border:2px solid #2196F3;padding:4px 18px;box-shadow:0 2px 8px #2196F322;">余 ' + data.RestCardsNum + '</div>');
    }

    // 牌山上方显示立直棒图标+数量（0也显示）
    if (typeof data.RiichiBang !== 'undefined') {
      $('#gameDiv').append('<div id="riichibang-info" style="position:absolute;left:50%;top:calc(50% - 70px);transform:translateX(-50%);z-index:22;width:100%;text-align:center;font-size:1.1em;font-weight:bold;color:#b44;background:#fffbe8cc;border-radius:8px;padding:2px 0;display:flex;align-items:center;justify-content:center;gap:8px;max-width:120px;margin:0 auto;">'
        + '<img src="img/RiichiBang.svg" style="width:14px;height:38px;vertical-align:middle;display:inline-block;">'
        + '<span style="margin-left:6px;">× ' + data.RiichiBang + '</span>'
        + '</div>');
    }

    // 渲染四个方位label在桌布中心正方形区四角，顺序以自己为下方
    const CENTER = TABLE_SIZE / 2;
    const SQUARE_HALF = 80; // 正方形半边长
    const windNames = ['东', '南', '西', '北'];
    const windRotates = [0, 270, 180, 90];
    const cornerOffsets = [
      [-SQUARE_HALF - 18, SQUARE_HALF - 18], 
      [SQUARE_HALF - 18, SQUARE_HALF - 18],   
      [SQUARE_HALF - 18, -SQUARE_HALF - 18],  
      [-SQUARE_HALF - 18, -SQUARE_HALF - 18]
    ];
    const myPos = data.Position;
    for (let i = 0; i < 4; i++) {
      const windIdx = (myPos + i) % 4;
      const wind = windNames[windIdx];
      const rotate = windRotates[i];
      const [dx, dy] = cornerOffsets[i];
      // 高亮自己的风字label
      const isSelf = i === 0;
      const highlight = isSelf ? 'background:#ffe066;color:#b8860b;font-weight:bold;' : 'background:#fff3;color:#222;';
      $('#gameDiv').append('<span class="pos-label" style="position:absolute;left:' + (CENTER + dx) + 'px;top:' + (CENTER + dy) + 'px;z-index:30;font-size:1.3em;' + highlight + 'border-radius:6px;padding:2px 10px;transform:rotate(' + rotate + 'deg);">' + wind + '</span>');
    }
  }
  // 以自己为下方旋转Players数组
  const myPos = data.Position;
  const players = data.Players.slice().sort((a, b) => ((a.Position - myPos + 4) % 4) - ((b.Position - myPos + 4) % 4));
  const pos2dir = ['east', 'south', 'west', 'north'];
  players.forEach(function(player, idx) {
    var dir = pos2dir[idx]; // idx=0:自己, 1:下家, 2:对家, 3:上家
    // 渲染立直棒
    if (player.Status === 'Riichi') {
      const centerX = TABLE_SIZE / 2;
      const centerY = TABLE_SIZE / 2;
      let riichiX = centerX, riichiY = centerY;
      let rotate = '';
      if (dir === 'east') {
        riichiX = centerX;
        riichiY = centerY + 150;
        rotate = 'transform:rotate(90deg);';
      } else if (dir === 'south') {
        riichiX = centerX + 150;
        riichiY = centerY;
      } else if (dir === 'west') {
        riichiX = centerX;
        riichiY = centerY - 150;
        rotate = 'transform:rotate(90deg);';
      } else if (dir === 'north') {
        riichiX = centerX - 150;
        riichiY = centerY;
      }
      const riichiW = 11, riichiH = 84;
      const left = riichiX - riichiW / 2;
      const top = riichiY - riichiH / 2;
      $('#gameDiv').append(
        '<img src="img/RiichiBang.svg" style="position:absolute;left:' + left + 'px;top:' + top + 'px;width:' + riichiW + 'px;height:' + riichiH + 'px;z-index:120;' + rotate + '">'
      );
    }
    // 渲染点数
    const centerX = TABLE_SIZE / 2;
    const centerY = TABLE_SIZE / 2;
    let pointsX = centerX, pointsY = centerY;
    let pointsRotate = '';
    if (dir === 'east') {
      pointsX = centerX;
      pointsY = centerY + 120;
    } else if (dir === 'south') {
      pointsX = centerX + 120;
      pointsY = centerY;
      pointsRotate = 'transform:rotate(270deg);';
    } else if (dir === 'west') {
      pointsX = centerX;
      pointsY = centerY - 120;
      pointsRotate = 'transform:rotate(180deg);';
    } else if (dir === 'north') {
      pointsX = centerX - 120;
      pointsY = centerY;
      pointsRotate = 'transform:rotate(90deg);';
    }
    const pointsW = 60, pointsH = 28;
    const pointsLeft = pointsX - pointsW / 2;
    const pointsTop = pointsY - pointsH / 2;
    $('#gameDiv').append(
      '<div style="position:absolute;left:' + pointsLeft + 'px;top:' + pointsTop + 'px;width:' + pointsW + 'px;height:' + pointsH + 'px;z-index:121;display:flex;align-items:center;justify-content:center;font-size:1.2em;font-weight:bold;background:#fffbe8cc;border-radius:8px;border:1.5px solid #e0b96a;box-shadow:0 2px 8px #0002;' + pointsRotate + '">' 
      + player.Points + '</div>');

    // 统计杠的数量
    const kanCount = (Array.isArray(player.ShowCards) && player.ShowCards.length > 0) ? player.ShowCards.filter(meld => meld.Type === 'Ankan' || meld.Type === 'Minkan').length : 0;
    // 渲染手牌
    player.HandCards.forEach(function(card, idx) { 
      if(kanCount == 4) var pos = positions[dir].hand[idx];
      else var pos = positions[dir].hand[idx + 1];
      var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
      
      // 只有自己显示牌面，其他玩家显示牌背
      if (dir === 'east') { // 自己
        var back = '<img class="mj-back" src="img/Front.svg">';
        var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
        var cardId = 'hand-' + idx;
        $('#gameDiv').append('<span id="' + cardId + '" class="mj-card ' + dir + ' selectable-card" style="position:absolute;cursor:pointer;' + style + '" data-card-index="' + idx + '" data-card-type="hand">' + back + front + '</span>');
      } else { // 其他玩家
        $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '"><img class="mj-back" src="img/Back.svg"></span>');
      }
    });
    // 渲染DrawCard（摸牌）
    if (player.DrawCard) {
      if(kanCount == 4) var pos = positions[dir].hand[player.HandCards.length + 1];
      else var pos = positions[dir].hand[player.HandCards.length + 2];
      var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
      
      // 只有自己显示牌面，其他玩家显示牌背
      if (dir === 'east') { // 自己
        var back = '<img class="mj-back" src="img/Front.svg">';
        var front = '<img class="mj-front" src="' + GetCardImgSrc(player.DrawCard) + '">';
        var cardId = 'draw-card';
        $('#gameDiv').append('<span id="' + cardId + '" class="mj-card ' + dir + ' selectable-card" style="position:absolute;cursor:pointer;' + style + '" data-card-index="' + (player.HandCards.length) + '" data-card-type="draw">' + back + front + '</span>');
      } else { // 其他玩家
        $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '"><img class="mj-back" src="img/Back.svg"></span>');
      }
    }
    // 渲染ShowCards（副露牌）
    if (Array.isArray(player.ShowCards) && player.ShowCards.length > 0) {
      // 副露区起始格（19格-空格数）
      let idx = player.HandCards.length + 6 - kanCount;
      player.ShowCards.forEach(function(meld) {
        let isKan = meld.Type === 'Ankan' || meld.Type === 'Minkan';
        let isKakan = meld.Type === 'Kakan';
        let slots = isKan ? 4 : 3;

        if (isKakan) {
          // 先和碰一样渲染3张
          meld.Cards.forEach(function(card, j) {
            var pos = positions[dir].hand[idx + j];
            var back = '<img class="mj-back" src="img/Front.svg">';
            var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
            var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
            var inner = back + front;
            if (meld.Closed && meld.Closed[j]) inner = '<img class="mj-back" src="img/Back.svg">';
            if (meld.Turn && meld.Turn[j]) inner = '<div style="width:100%;height:100%;transform:rotate(270deg) translateX(-6px);transform-origin:center center;">' + inner + '</div>';
            $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;z-index:10;' + style + '">' + inner + '</span>');
          });
          // 再在横置牌上叠加一张横置牌向中间移动38px
          meld.Cards.forEach(function(card, j) {
            if (meld.Turn && meld.Turn[j]) {
              var pos = positions[dir].hand[idx + j];
              var back = '<img class="mj-back" src="img/Front.svg">';
              var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
              var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
              var inner2 = back + front;
              if (meld.Closed && meld.Closed[j]) inner2 = '<img class="mj-back" src="img/Back.svg">';
              // 横置并向中间移动30px
              inner2 = '<div style="width:100%;height:100%;transform:rotate(270deg) translate(32px);transform-origin:center center;">' + inner2 + '</div>';
              $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;z-index:20;' + style + '">' + inner2 + '</span>');
            }
          });
        } else {
          meld.Cards.forEach(function(card, j) {
            var pos = positions[dir].hand[idx + j];
            var back = '<img class="mj-back" src="img/Front.svg">';
            var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
            var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
            var inner = back + front;
            if (meld.Closed && meld.Closed[j]) inner = '<img class="mj-back" src="img/Back.svg">';
            if (meld.Turn && meld.Turn[j]) inner = '<div style="width:100%;height:100%;transform:rotate(270deg) translateX(-6px);transform-origin:center center;">' + inner + '</div>';
            $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '">' + inner + '</span>');
          });
        }
        idx += slots;
      });
    }
    // 渲染河牌
    (player.RiverCards || []).forEach(function(card, idx) {
      var pos = positions[dir].river[idx];
      var back = '<img class="mj-back" src="img/Front.svg">';
      var front = '<img class="mj-front" src="' + GetCardImgSrc(card) + '">';
      var style = 'left:' + pos.left + 'px;top:' + pos.top + 'px;';
      var inner = back + front;
      if (card.Turn) {
        inner = '<div style="width:100%;height:100%;transform:rotate(270deg);transform-origin:center center;">' + back + front + '</div>';
      }
      $('#gameDiv').append('<span class="mj-card ' + dir + '" style="position:absolute;' + style + '">' + inner + '</span>');
    });
    // 渲染按钮区（只在自己）
    if (dir === 'east') {
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
      (players[0].Options || []).slice(0, 5).forEach(function(opt, idx) {
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
  });


  // 按钮点击选中功能
  $('.game-action-btn').off('click').on('click', function() {
    const action = $(this).data('action');
    socket.emit('playerAction', { Action: action });
  });

  // 麻将牌点击选中功能
  $('.selectable-card').off('click').on('click', function() {
    // 移除其他牌的选中状态
    $('.selectable-card').removeClass('selected');
    // 添加当前牌的选中状态
    $(this).addClass('selected');
    
    // 获取牌的信息
    const cardIndex = $(this).data('card-index');
    const cardType = $(this).data('card-type');
    let cardValue = null;
    if (cardType === 'hand') {
      cardValue = players[0].HandCards[cardIndex];
    } else if (cardType === 'draw') {
      cardValue = players[0].DrawCard;
    }
    
    socket.emit('selectCard', {Card: cardValue, Type: cardType});
    
    console.log('选中牌:', cardType, cardIndex, cardValue);
  });
});