import { _decorator, Component, Node, Sprite, SpriteFrame, Vec2 } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('Card')
export class Card extends Component {
    @property([SpriteFrame])
    cards: SpriteFrame[] = [];

    canClick: boolean = true;

    private readonly CARD_HOVER_OFFSET = 15;


    setCard(cardName: string, cardPosition: Vec2, canClick: boolean) {
        let index = this.cards.findIndex(card => card.name === cardName);
        this.node.getComponent(Sprite).spriteFrame = this.cards[index];

        this.node.setPosition(cardPosition.x, cardPosition.y);

        this.canClick = canClick;
        if (!this.canClick) return;

        this.node.on(Node.EventType.MOUSE_ENTER, () => {
            this.node.setPosition(cardPosition.x, cardPosition.y + this.CARD_HOVER_OFFSET);
        });
        this.node.on(Node.EventType.MOUSE_LEAVE, () => {
            if (this.node.position.y - cardPosition.y < this.CARD_HOVER_OFFSET) return;
            this.node.setPosition(cardPosition.x, cardPosition.y);
        });
    }
}
export default Card;