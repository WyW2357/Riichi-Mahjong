# Riichi Mahjong

Riichi Mahjong 是一个日式立直麻将 Web 游戏项目，目前为项目完善和测试阶段。

## 目录结构

```
Riichi Mahjong/
├── GameData/                # 游戏相关数据文件
│   └── GameData_xxxx.txt    # 测试日志数据
├── src/
│   ├── classes/             # 游戏核心类
│   │   ├── game.js          # 对局逻辑类
│   |   ├── player.js        # 玩家类
│   |   ├── card.js          # 牌类
|   |   └── deck.js          # 牌组类
│   ├── client/              # 前端资源
│   │   ├── css/             # 样式与字体资源
│   │   │   ├── font/        # 字体文件
│   │   │   ├── index.css
│   │   │   ├── card.css
│   │   |   ├── deck.css
│   │   │   ├── materialize.css
│   │   │   └── materialize.min.css
│   │   ├── img/             # 图片资源（未列出）
│   │   ├── js/              # 前端 JS 库
│   │   |   ├── japanesemaj.min.js
│   │   |   ├── jquery-2.1.4.min.js
│   │   |   ├── materialize.js
│   │   |   └── materialize.min.js
│   │   ├── index.html       # 主页面
│   │   └── main.js          # 主程序
│   └── server/              # 后端代码
│       └── app.js           # 后端入口文件
├── README.md                # 说明文档
└── package.json             # 项目依赖包
```

## 主要资源说明
- **GameData/**：存放游戏相关的静态数据文件。
- **src/client/css/font/**：包含多种字体文件，适用于不同 UI 风格。
- **src/client/css/materialize.css**：Materialize CSS 框架，便于快速开发响应式界面。
- **src/client/js/**：集成了 jQuery 和 Materialize 的 JS 文件。

## 技术栈
- 前端：HTML5、CSS3、JavaScript、Materialize CSS、jQuery
- 后端：待定（server 目录预留）

## 后续开发建议
1. **前端页面开发**：
   - 完善核心游戏逻辑 JS 文件。
2. **后端开发**：
   - 选择 Node.js、Python、Java 等后端技术，实现游戏房间、对局逻辑等。
3. **资源完善**：
   - 补充图片、音效等资源。
4. **开发文档**：
   - 持续完善 README，记录开发流程和接口文档。

---

如需协助搭建前端页面或后端服务，请随时提出！ 
