import { _decorator, Component, Node, Sprite, SpriteFrame, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

import net from './Network';


@ccclass('Card')
export class Card extends Component {
    @property([SpriteFrame])
    cards: SpriteFrame[] = [];

    canClick: boolean = true;

    private readonly CARD_HOVER_OFFSET = 15;


    setCard(cardName: string, cardPosition: Vec2, canClick: boolean) {
        if (cardName.startsWith('h')) {
            cardName = cardName.substring(1);
            this.node.setRotationFromEuler(0, 0, 90);
        }
        this.node.getComponent(Sprite).spriteFrame = this.cards[this.cards.findIndex(card => card.name === cardName)];

        this.node.setPosition(cardPosition.x, cardPosition.y);

        this.canClick = canClick;
        if (!this.canClick) return;

        this.node.on(Node.EventType.MOUSE_ENTER, () => {
            this.node.setPosition(cardPosition.x, cardPosition.y + this.CARD_HOVER_OFFSET);
        });
        this.node.on(Node.EventType.MOUSE_LEAVE, () => {
            this.node.setPosition(cardPosition.x, cardPosition.y);
        });

        this.node.on(Node.EventType.MOUSE_DOWN, () => {
            if (this.canClick) {
                net.emit('cardClicked', cardName);
            }
        });

    }
}
export default Card;