import { _decorator, Color, Component, instantiate, Label, Node, Prefab, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

import Card from './Card';
import ShownCards from './ShownCards';

interface DataInfo {
    Seat: number,
    HandCards: string[][],
    DrawnCard: string[],
    Timer: number[],
    Furiten: boolean,
    RiverCards: string[][],
    ShownCards: string[][][],
    WallCards: string[],
    Heads: string[],
    Names: string[],
    Points: number[],
    StageNum: number,
    RoundNum: number,
    RiichiBou: boolean[],
    RestCardsNum: number,
    RiichiBouNum: number,
    Options: string[][]
}


@ccclass('Game')
export class Game extends Component {
    @property(Node)
    MiddleTableNode: Node = null;

    @property(Label)
    TimerLabel: Label = null;

    @property(Node)
    HeadsNode: Node = null;

    @property(Node)
    HandCardsNode: Node = null;

    @property(Node)
    DrawnCardNode: Node = null;
    
    @property(Node)
    RiverCardsNode: Node = null;

    @property(Node)
    ShownCardsNode: Node = null;

    @property(Node)
    ButtonsNode: Node = null;

    @property(Prefab)
    CardPrefab: Prefab = null;

    @property(Prefab)
    ChiCardsPrefab: Prefab = null;
    
    @property(Prefab)
    PonCardsPrefab: Prefab = null;

    @property(Prefab)
    AnkanCardsPrefab: Prefab = null;

    @property(Prefab)
    MinkanCardsPrefab: Prefab = null;

    @property(Prefab)
    KakanCardsPrefab: Prefab = null;

    @property(Prefab)
    ButtonPrefab: Prefab = null;

    @property([SpriteFrame])
    HeadsSpriteFrames: SpriteFrame[] = [];

    CurrentData: DataInfo = {
        Seat: 0,
        Timer: [0, 0],
        Furiten: false,
        DrawnCard: [null, null, null, null],
        HandCards: [[],[],[],[]],
        RiverCards: [[],[],[],[]],
        ShownCards: [[],[],[],[]],
        WallCards: [null, null, null, null, null],
        Heads: [null, null, null, null],
        Names: [null, null, null, null],
        Points: [0,0,0,0],
        StageNum: 1,
        RoundNum: 1,
        RiichiBou: [false, false, false, false],
        RestCardsNum: 0,
        RiichiBouNum: 0,
        Options: []
    };

    private readonly CARD_WIDTH = 45;

    private readonly CARD_HEIGHT = 60;

    private readonly WALL_CARD_SCALE = 0.8;

    private readonly SHOWN_CARDS_DATA = {
        Chi: {
            width: this.CARD_WIDTH * 2 + this.CARD_HEIGHT,
            height: this.CARD_HEIGHT
        },
        Pon: {
            width: this.CARD_WIDTH * 2 + this.CARD_HEIGHT,
            height: this.CARD_HEIGHT
        },
        Ankan: {
            width: this.CARD_WIDTH * 4,
            height: this.CARD_HEIGHT
        },
        Minkan: {
            width: this.CARD_WIDTH * 3 + this.CARD_HEIGHT,
            height: this.CARD_HEIGHT
        },
        Kakan: {
            width: this.CARD_WIDTH * 2 + this.CARD_HEIGHT,
            height: this.CARD_WIDTH * 2
        }
    }

    private readonly BUTTON_WIDTH = 80;

    StageNode: Label = null;
    RoundNode: Label = null;
    RestCardsNumNode: Label = null;
    RiichiBouNumNode: Label = null;

    RiichiBousNode: Node = null;
    WindsNode: Node = null;
    WallCardsNode: Node = null;

    TimeCounter: number = 0;


    initGame() {
        this.StageNode = this.MiddleTableNode.getChildByName("Label").getChildByName("Stage").getComponent(Label);
        this.RoundNode = this.MiddleTableNode.getChildByName("Label").getChildByName("Round").getComponent(Label);
        this.RestCardsNumNode = this.MiddleTableNode.getChildByName("Label").getChildByName("RestCardsNum").getComponent(Label);
        this.RiichiBouNumNode = this.MiddleTableNode.getChildByName("Label").getChildByName("RiichiBouNum").getComponent(Label);

        this.RiichiBousNode = this.MiddleTableNode.getChildByName("RiichiBous");
        this.WindsNode = this.MiddleTableNode.getChildByName("Winds");
        this.WallCardsNode = this.MiddleTableNode.getChildByName("WallCards");
    }


    setStageNum(stageNum: number) {
        let stageLabel = '';
        switch(stageNum) {
            case 1:
                stageLabel = '东一局';
                break;
            case 2:
                stageLabel = '东二局';
                break;
            case 3:
                stageLabel = '东三局';
                break;
            case 4:
                stageLabel = '东四局';
                break;
            case 5:
                stageLabel = '南一局';
                break;
            case 6:
                stageLabel = '南二局';
                break;
            case 7:
                stageLabel = '南三局';
                break;
            case 8:
                stageLabel = '南四局';
                break;
            case 9:
                stageLabel = '西一局';
                break;
            case 10:
                stageLabel = '西二局';
                break;
            case 11:
                stageLabel = '西三局';
                break;
            case 12:
                stageLabel = '西四局';
                break;
            default: stageLabel = ''; break;
        }
        this.StageNode.string = stageLabel;
    }


    setRoundNum(roundNum: number) {
        let roundLabel = roundNum.toString() + '本场';
        this.RoundNode.string = roundLabel;
    }


    setRestCardsNum(restCardsNum: number) {
        let restCardsNumLabel = '余 ' + restCardsNum.toString();
        this.RestCardsNumNode.string = restCardsNumLabel;
    }
    
    
    setRiichiBouNum(riichiBouNum: number) {
        let riichiBouNumLabel = riichiBouNum.toString() + ' X';
        this.RiichiBouNumNode.string = riichiBouNumLabel;
    }


    setRiichiBou(riichiBou: boolean[]) {
        for (let i = 0; i < this.RiichiBousNode.children.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.RiichiBousNode.children[pos].getComponent(Sprite).enabled = riichiBou[i];
        }
    }


    setWinds() {
        for (let i = 0; i < this.WindsNode.children.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.WindsNode.children[pos].getChildByName("Label").getComponent(Label).string = i === 0 ? '东' : i === 1 ? '南' : i === 2 ? '西' : '北';
            this.WindsNode.children[pos].getChildByName("Label").getComponent(Label).color = i === 0 ? new Color(255, 0, 0) : new Color(0, 0, 0);
        }
    }


    setWallCards(wallCards: string[]) {
        this.WallCardsNode.removeAllChildren();
        for (let i = 0; i < wallCards.length; i++) {
            let wallCardNode = instantiate(this.CardPrefab);
            wallCardNode.getComponent(UITransform).setContentSize(this.CARD_WIDTH * this.WALL_CARD_SCALE, this.CARD_HEIGHT * this.WALL_CARD_SCALE);
            let wallCardPosition = new Vec2(i * this.CARD_WIDTH * this.WALL_CARD_SCALE, 0);
            wallCardNode.getComponent(Card).setCard(wallCards[i], wallCardPosition, false);
            this.WallCardsNode.addChild(wallCardNode);
        }
    }


    setHeads(headNames: string[], names: string[], points: number[]) {
        for (let i = 0; i < this.HeadsNode.children.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            this.HeadsNode.children[pos].getChildByName("Picture").getComponent(Sprite).spriteFrame = this.HeadsSpriteFrames[this.HeadsSpriteFrames.findIndex(head => head.name === headNames[i])];
            this.HeadsNode.children[pos].getChildByName("Name").getComponent(Label).string = names[i];
            this.HeadsNode.children[pos].getChildByName("Point").getComponent(Label).string = (points[i] / 100).toString() + ' 00';
            if (pos === 0) {
                this.HeadsNode.children[0].getChildByName("Furiten").getComponent(Label).string = this.CurrentData.Furiten ? '振听' : '';
            }
        }
    }


    setHandCards(handCards: string[][]) {
        for (let i = 0; i < this.HandCardsNode.children.length; i++) {
            this.HandCardsNode.children[i].removeAllChildren();
        }
        for (let i = 0; i < handCards.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4; 
            for (let j = 0; j < handCards[i].length; j++) {
                let handCardNode = instantiate(this.CardPrefab);
                let handCardPosition = new Vec2(j * this.CARD_WIDTH, 0);
                handCardNode.getComponent(Card).setCard(handCards[i][j], handCardPosition, pos === 0);
                this.HandCardsNode.children[pos].addChild(handCardNode);
            }
        }
    }


    setDrawnCard(drawnCard: string[]) {
        for (let i = 0; i < this.DrawnCardNode.children.length; i++) {
            this.DrawnCardNode.children[i].removeAllChildren();
        }
        for (let i = 0; i < drawnCard.length; i++) {
            if (!drawnCard[i]) continue;
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4; 
            let drawnCardNode = instantiate(this.CardPrefab);
            let drawnCardPosition = new Vec2(this.CARD_WIDTH * this.CurrentData.HandCards[i].length + this.CARD_WIDTH / 2, 0);
            drawnCardNode.getComponent(Card).setCard(drawnCard[i], drawnCardPosition, pos === 0);
            this.DrawnCardNode.children[pos].addChild(drawnCardNode);
        }
    }


    setRiverCards(riverCards: string[][]) {
        for (let i = 0; i < this.RiverCardsNode.children.length; i++) {
            this.RiverCardsNode.children[i].removeAllChildren();
        }
        for (let i = 0; i < riverCards.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            let riverCardPosition = new Vec2(-this.CARD_WIDTH, 0);
            for (let j = 0; j < riverCards[i].length; j++) {
                let riverCardNode = instantiate(this.CardPrefab)
                riverCardPosition.x += this.CARD_WIDTH;
                if (j > 0 && j < 18 && j % 6 === 0) {
                    riverCardPosition.x = 0;
                    riverCardPosition.y -= this.CARD_HEIGHT;
                }
                if (riverCards[i][j].startsWith('h')) {
                    riverCardPosition.x += this.CARD_HEIGHT / 2 - this.CARD_WIDTH / 2;
                }
                riverCardNode.getComponent(Card).setCard(riverCards[i][j], riverCardPosition, false);
                this.RiverCardsNode.children[pos].addChild(riverCardNode);
                if (riverCards[i][j].startsWith('h')) {
                    riverCardPosition.x += this.CARD_HEIGHT / 2 - this.CARD_WIDTH / 2;
                }
            }
        }
    }


    setShownCards(shownCards: string[][][]) {
        for (let i = 0; i < this.ShownCardsNode.children.length; i++) {
            this.ShownCardsNode.children[i].removeAllChildren();
        }
        for (let i = 0; i < shownCards.length; i++) {
            let pos = ((4 - this.CurrentData.Seat) % 4 + i) % 4;
            let shownCardPosition = new Vec2(0, 0);
            for (let j = shownCards[i].length - 1; j >= 0; j--) {
                let shownCardNode = instantiate(this[this.CurrentData.ShownCards[i][j][0] + 'CardsPrefab']);
                shownCardPosition.x -= this.SHOWN_CARDS_DATA[this.CurrentData.ShownCards[i][j][0]].width / 2;
                if (this.CurrentData.ShownCards[i][j][0] === 'Kakan') {
                    shownCardPosition.y += (this.SHOWN_CARDS_DATA['Kakan'].height - this.CARD_HEIGHT) / 2;
                }
                shownCardNode.getComponent(ShownCards).setShownCards(this.CurrentData.ShownCards[i][j][1], shownCardPosition);
                this.ShownCardsNode.children[pos].addChild(shownCardNode);
                shownCardPosition.x -= this.SHOWN_CARDS_DATA[this.CurrentData.ShownCards[i][j][0]].width / 2;
                shownCardPosition.y = 0;
            }
        }
    }


    setOptions(options: string[][]) {
        for (let i = 0; i < this.ButtonsNode.children.length; i++) {
            this.ButtonsNode.children[i].removeAllChildren();
        }
        let buttonPosition = new Vec2(0, 0);
        for (let i = 0; i < options.length; i++) {
            let buttonNode = instantiate(this.ButtonPrefab);
            let optionLabel = '';
            switch (options[i][0]) {
                case 'Chi':
                    optionLabel = '吃';
                    break;
                case 'Pon':
                    optionLabel = '碰';
                    break;
                case 'Kan':
                    optionLabel = '杠';
                    break;
                case 'Tsumo':
                    optionLabel = '自摸';
                    break;
                case 'Ron':
                    optionLabel = '荣和';
                    break;
                case 'Pass':
                    optionLabel = '过';
                    break;
                default:
                    optionLabel = options[i][0];
                    break;
            }
            buttonNode.getChildByName('Label').getComponent(Label).string = optionLabel;
            this.ButtonsNode.addChild(buttonNode);
            buttonNode.setPosition(buttonPosition.x, buttonPosition.y);
            buttonPosition.x += this.BUTTON_WIDTH * 1.1;
        }
    }


    onLoad() {
        this.initGame();

        this.CurrentData = {
            Seat: 1,
            Timer: [5, 15],
            Furiten: false,
            DrawnCard: ['1s', '2s', '3s', '4s'],
            HandCards: [
                ['1p'],
                ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p', '1p'],
                ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1z', '1z', '1z', '1p', '1p'],
                ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1z', '1z', '1z', '1p', '1p']
            ],
            RiverCards: [
                ['1m', 'h2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', 'back', 'back', 'back', 'back'],
                ['1m', '2m', '3m', '1p', '2p', 'h3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z'],
                ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', '3z', '4z'],
                ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '1z', '2z', 'h3z', '4z']
            ],
            ShownCards: [[['Ankan', '1111z'], ['Ankan', '1111z'], ['Ankan', '1111z'], ['Ankan', '1111z']],[],[],[]],
            WallCards: ['1m', 'back', 'back', 'back', 'back'],
            Heads: ['head_0', 'head_1', 'head_2', 'head_3'],
            Names: ['P1', 'P2', 'P3', 'P4'],
            Points: [25000, 25000, 30000, 25000],
            StageNum: 1,
            RoundNum: 1,
            RiichiBou: [false, false, false, false],
            RestCardsNum: 70,
            RiichiBouNum: 4,
            Options: [['Chi', 'h423m', 'h430m', 'h435m', 'h406m', 'h456m'], ['Pon', 'h444m'], ['Pass'], ['Tsumo'], ['Tsumo'], ['Tsumo']]
        };
        this.setWinds();

        this.setStageNum(this.CurrentData.StageNum);

        this.setRoundNum(this.CurrentData.RoundNum);

        this.setRestCardsNum(this.CurrentData.RestCardsNum);

        this.setRiichiBouNum(this.CurrentData.RiichiBouNum);
        
        this.setRiichiBou(this.CurrentData.RiichiBou);

        this.setWallCards(this.CurrentData.WallCards);
        
        this.setHeads(this.CurrentData.Heads, this.CurrentData.Names, this.CurrentData.Points);
        
        this.setHandCards(this.CurrentData.HandCards);

        this.setDrawnCard(this.CurrentData.DrawnCard);
        
        this.setRiverCards(this.CurrentData.RiverCards);

        this.setShownCards(this.CurrentData.ShownCards);

        this.setOptions(this.CurrentData.Options);
    }

    update(dt: number): void {
        if (this.CurrentData.Timer[0] + this.CurrentData.Timer[1] > 0) {
            this.TimeCounter += dt;
            if (this.TimeCounter >= 1) {
                this.TimeCounter = 0;
                this.CurrentData.Timer[1] > 0 ? this.CurrentData.Timer[1]-- : this.CurrentData.Timer[0]--;
                this.TimerLabel.string = this.CurrentData.Timer[0].toString() + ' + ' + this.CurrentData.Timer[1].toString();
            }
        } else {
            this.TimerLabel.string = '';
        }
    }
}
export default Game;