import { _decorator, Color, Component, instantiate, Label, Node, Prefab, Sprite, UITransform, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

import Card from './Card';
import Head from './Head';

interface DataInfo {
    Seat: number,
    HandCards: string[][],
    DrawnCard: string[],
    ShownCards: string[][],
    RiverCards: string[][],
    WallCards: string[],
    Points: number[],
    Stage: number,
    Round: number,
    RiichiBou: boolean[],
    RestCardsNum: number,
    RiichiBouNum: number,
    Action: any
}


@ccclass('Game')
export class Game extends Component {
    @property(Label)
    StageNode: Label = null;

    @property(Label)
    RoundNode: Label = null;

    @property(Label)
    RestCardsNumNode: Label = null;

    @property(Label)
    RiichiBouNumNode: Label = null;

    @property([Sprite])
    RiichiBangNodes: Sprite[] = [];

    @property([Label])
    WindsNodes: Label[] = [];

    @property(Node)
    WallCardsNode: Node = null;

    @property([Node])
    HeadNodes: Node[] = [];

    @property([Node])
    HandCardsNodes: Node[] = [];

    @property([Node])
    DrawnCardNodes: Node[] = [];
    
    @property([Node])
    RiverCardsNodes: Node[] = [];

    @property(Prefab)
    cardPrefab: Prefab = null;

    MouseX: number = 0;

    MouseY: number = 0;

    CurrentData: DataInfo = {
        Seat: 0,
        DrawnCard: [null, null, null, null],
        HandCards: [[],[],[],[]],
        ShownCards: [[],[],[],[]],
        RiverCards: [[],[],[],[]],
        WallCards: [null, null, null, null, null],
        Points: [0,0,0,0],
        Stage: 0,
        Round: 0,
        RiichiBou: [false, false, false, false],
        RestCardsNum: 0,
        RiichiBouNum: 0,
        Action: null
    };

    private readonly CARD_WIDTH = 45;

    private readonly CARD_HEIGHT = 60;

    private readonly WALL_CARD_SCALE = 0.8;


    setStage(stage: number) {
        if (this.CurrentData.Stage === stage) return;
        this.CurrentData.Stage = stage;
        let stageLabel = "";
        switch(stage) {
            case 1: stageLabel = '东一局'; break;
            case 2: stageLabel = '东二局'; break;
            case 3: stageLabel = '东三局'; break;
            case 4: stageLabel = '东四局'; break;
            case 5: stageLabel = '南一局'; break;
            case 6: stageLabel = '南二局'; break;
            case 7: stageLabel = '南三局'; break;
            case 8: stageLabel = '南四局'; break;
            case 9: stageLabel = '西一局'; break;
            case 10: stageLabel = '西二局'; break;
            case 11: stageLabel = '西三局'; break;
            case 12: stageLabel = '西四局'; break;
            case 13: stageLabel = '北一局'; break;
            case 14: stageLabel = '北二局'; break;
            case 15: stageLabel = '北三局'; break;
            case 16: stageLabel = '北四局'; break;
        }
        this.StageNode.string = stageLabel;
    }


    setRound(round: number) {
        if (this.CurrentData.Round === round) return;
        this.CurrentData.Round = round;
        let roundLabel = round.toString() + '本场';
        this.RoundNode.string = roundLabel;
    }


    setRestCardsNum(restCardsNum: number) {
        if (this.CurrentData.RestCardsNum === restCardsNum) return;
        this.CurrentData.RestCardsNum = restCardsNum;
        let restCardsNumLabel = '余 ' + restCardsNum.toString();
        this.RestCardsNumNode.string = restCardsNumLabel;
    }
    
    
    setRiichiBouNum(riichiBouNum: number) {
        if (this.CurrentData.RiichiBouNum === riichiBouNum) return;
        this.CurrentData.RiichiBouNum = riichiBouNum;
        let riichiBouNumLabel = riichiBouNum.toString() + ' X';
        this.RiichiBouNumNode.string = riichiBouNumLabel;
    }


    setRiichiBou(riichiBou: boolean[]) {
        if (this.CurrentData.RiichiBou === riichiBou) return;
        this.CurrentData.RiichiBou = riichiBou;
        for (let i = 0; i < this.RiichiBangNodes.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.RiichiBangNodes[pos].getComponent(Sprite).enabled = riichiBou[i];
        }
    }


    setWind(wind: number) {
        if (this.CurrentData.Seat === wind) return;
        this.CurrentData.Seat = wind;
        for (let i = 0; i < this.WindsNodes.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.WindsNodes[pos].string = i === 0 ? '东' : i === 1 ? '南' : i === 2 ? '西' : '北';
            this.WindsNodes[pos].getComponent(Label).color = i === 0 ? new Color(255, 0, 0) : new Color(0, 0, 0);
        }
    }


    setWallCards(wallCards: string[]) {
        if (this.CurrentData.WallCards === wallCards) return;
        this.CurrentData.WallCards = wallCards;
        this.WallCardsNode.removeAllChildren();
        for (let i = 0; i < wallCards.length; i++) {
            let wallCardNode = instantiate(this.cardPrefab);
            wallCardNode.getComponent(UITransform).setContentSize(this.CARD_WIDTH * this.WALL_CARD_SCALE, this.CARD_HEIGHT * this.WALL_CARD_SCALE);
            let wallCardPosition = new Vec2(i * this.CARD_WIDTH * this.WALL_CARD_SCALE, 0);
            wallCardNode.getComponent(Card).setCard(wallCards[i], wallCardPosition, false);
            this.WallCardsNode.addChild(wallCardNode);
        }
    }


    setHeads(headNames: string[], names: string[]) {
        for (let i = 0; i < this.HeadNodes.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.HeadNodes[pos].getComponent(Head).setHead(headNames[i], names[i]);
        }
    }


    setPoints(points: number[]) {
        if (this.CurrentData.Points === points) return;
        this.CurrentData.Points = points;
        for (let i = 0; i < this.HeadNodes.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.HeadNodes[pos].getComponent(Head).setPoint(points[i]);
        }
    }


    setHandCards(handCards: string[][]) {
        if (this.CurrentData.HandCards === handCards) return;
        this.CurrentData.HandCards = handCards;
        for (let i = 0; i < this.HandCardsNodes.length; i++) {
            this.HandCardsNodes[i].removeAllChildren();
        }
        for (let i = 0; i < handCards.length; i++) {
            for (let j = 0; j < handCards[i].length; j++) {
                let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4; 
                let handCardNode = instantiate(this.cardPrefab);
                let handCardPosition = new Vec2(j * this.CARD_WIDTH, 0);
                handCardNode.getComponent(Card).setCard(handCards[i][j], handCardPosition, pos === 0);
                this.HandCardsNodes[pos].addChild(handCardNode);
            }
        }
    }


    setDrawnCard(drawnCard: string[]) {
        if (this.CurrentData.DrawnCard === drawnCard) return;
        this.CurrentData.DrawnCard = drawnCard;
        for (let i = 0; i < this.DrawnCardNodes.length; i++) {
            this.DrawnCardNodes[i].removeAllChildren();
        }
        for (let i = 0; i < drawnCard.length; i++) {
            if (!drawnCard[i]) continue;
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4; 
            let drawnCardNode = instantiate(this.cardPrefab);
            let drawnCardPosition = new Vec2(this.CARD_WIDTH * this.CurrentData.HandCards[i].length + this.CARD_WIDTH / 2, 0);
            drawnCardNode.getComponent(Card).setCard(drawnCard[i], drawnCardPosition, pos === 0);
            this.DrawnCardNodes[pos].addChild(drawnCardNode);
        }
    }


    setRiverCards(riverCards: string[][]) {
        if (this.CurrentData.RiverCards === riverCards) return;
        this.CurrentData.RiverCards = riverCards;
        for (let i = 0; i < this.RiverCardsNodes.length; i++) {
            this.RiverCardsNodes[i].removeAllChildren();
        }
        for (let i = 0; i < riverCards.length; i++) {
            for (let j = 0; j < riverCards[i].length; j++) {
                let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4; 
                let riverCardNode = instantiate(this.cardPrefab);
                let riverCardPosition = j < 18 ? new Vec2((j % 6) * this.CARD_WIDTH, -Math.floor(j / 6) * this.CARD_HEIGHT) : new Vec2((j - 12) * this.CARD_WIDTH, -2 * this.CARD_HEIGHT);
                riverCardNode.getComponent(Card).setCard(riverCards[i][j], riverCardPosition, false);
                this.RiverCardsNodes[pos].addChild(riverCardNode);
            }
        }
    }


    onLoad() {
        let seat = 1;
        this.setWind(seat);

        let stageNum = 1;
        this.setStage(stageNum);

        let roundNum = 1;
        this.setRound(roundNum);

        let restCardsNum = 70;
        this.setRestCardsNum(restCardsNum);

        let riichiBouNum = 4;
        this.setRiichiBouNum(riichiBouNum);

        let riichiBang = [true, true, true, true];
        this.setRiichiBou(riichiBang);

        let wallCards = ['1m', 'back', 'back', 'back', 'back'];
        this.setWallCards(wallCards);

        let headNames = ['head_0', 'head_1', 'head_2', 'head_3'];
        let names = ['P1', 'P2', 'P3', 'P4'];
        this.setHeads(headNames, names);

        let points = [25000, 25000, 30000, 25000];
        this.setPoints(points);

        let handCards = [
            ['1m', '2m', '3m', '4m', '0m', '6m', '7m', '8m', '9m', '1z', '1z', '1z', '1p', '1p'],
            ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p', '1p'],
            ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1z', '1z', '1z', '1p', '1p'],
            ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1z', '1z', '1z', '1p', '1p']
        ];
        this.setHandCards(handCards);

        let drawnCard = ['1s', '2s', '3s', '4s'];
        this.setDrawnCard(drawnCard);

        let riverCards = [
            ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', 'back', 'back', 'back', 'back'],
            ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z'],
            ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z'],
            ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z'],
            ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z']
        ];
        this.setRiverCards(riverCards);
    }
}
export default Game;