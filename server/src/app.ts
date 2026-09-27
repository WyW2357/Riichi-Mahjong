import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import Card from './Card.ts';
import Player from './Player.ts';
import Game from './Game.ts';


const PORT: number = 3000;
const wss: WebSocketServer = new WebSocketServer({ port: PORT });

const game: Game = new Game(true, true, false, false, false, false);


wss.on('connection', (ws: WebSocket) => {
	ws.on('join', (Name: string) => {
		let player = new Player(Name, ws);
		game.Players.push(player);
		if (game.Players.length === 4) {
			let positions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
			for (let i = 0; i < 4; i++) {
				game.Players[i].Position = positions[i];
			}
		}
		game.NewRound();
	});
});


console.log(`running on port ${PORT}`);