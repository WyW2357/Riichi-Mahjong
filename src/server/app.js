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
          game.EmitToPlayers('gameBegin', { Code: data.Code });
          game.StartNewRound();
        }
      }
    }
  });
});

// 启动服务器
server.listen(PORT, () => console.log(`正在端口 ${PORT} 运行`));