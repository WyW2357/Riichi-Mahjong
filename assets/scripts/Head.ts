import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('Head')
export class Head extends Component {
    @property([SpriteFrame])
    heads: SpriteFrame[] = [];


    setHead(headName: string, name: string) {
        let index = this.heads.findIndex(card => card.name === headName);
        this.node.getChildByName('Picture').getComponent(Sprite).spriteFrame = this.heads[index];

        this.node.getChildByName('Name').getComponent(Label).string = name;
    }


    setPoint(point: number) {
        this.node.getChildByName('Point').getComponent(Label).string = (point / 100).toString() + ' 00';
    }
}
export default Head;