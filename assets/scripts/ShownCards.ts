import { _decorator, Component, Sprite, SpriteFrame, Vec2 } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('ShownCards')
export class ShownCards extends Component {
    @property([SpriteFrame])
    shownCards: SpriteFrame[] = [];


    setShownCards(shownCardsName: string, shownCardPosition: Vec2) {
        this.node.getComponent(Sprite).spriteFrame = this.shownCards[this.shownCards.findIndex(shownCards => shownCards.name === shownCardsName)];

        this.node.setPosition(shownCardPosition.x, shownCardPosition.y);
    }
}
export default ShownCards;