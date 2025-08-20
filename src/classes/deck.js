const Card = require('./card');

const Deck = function (washizu = false) {
  this.Cards = [];
  this.washizu = washizu;
  // this.i = 0;

  //创建136张初始手牌
  this.Shuffle = () => {
    this.Cards = [];
    for (let i = 1; i <= 4; i++) {
      for (let v = 1; v <= 9; v++) {
        if (i !== 4) {
          if (i === 1 && v === 5)
            if (this.washizu) {
              this.Cards.push(new Card(0, 'm', true));
              this.Cards.push(new Card(0, 'p', true));
              this.Cards.push(new Card(0, 's', true));
            }
            else {
              this.Cards.push(new Card(0, 'm'));
              this.Cards.push(new Card(0, 'p'));
              this.Cards.push(new Card(0, 's'));
            }
          else if (this.washizu) {
            this.Cards.push(new Card(v, 'm', true));
            this.Cards.push(new Card(v, 'p', true));
            this.Cards.push(new Card(v, 's', true));
          }
          else {
            this.Cards.push(new Card(v, 'm'));
            this.Cards.push(new Card(v, 'p'));
            this.Cards.push(new Card(v, 's'));
          }
        }
        else {
          this.Cards.push(new Card(v, 'm'));
          this.Cards.push(new Card(v, 'p'));
          this.Cards.push(new Card(v, 's'));
        }
      }
    }
    for (let i = 1; i <= 4; i++) {
      for (let v = 1; v <= 7; v++) {
        if (i !== 4 && this.washizu)
          this.Cards.push(new Card(v, 'z', true));
        else
          this.Cards.push(new Card(v, 'z'));
      }
    }
  };

  //随机选择一张牌
  this.DealRandomCard = () => {
    // 随机选择一张牌的索引
    const index = Math.floor(Math.random() * this.Cards.length);
    const card = this.Cards[index];
    // 从牌组中移除这张牌
    this.Cards.splice(index, 1);
    return card;
    // let tempDeck = [new Card(1, 'z', true), new Card(2, 'z', true),
    // new Card(5, 'm', true), new Card(5, 'm'), new Card(1, 's', true), new Card(2, 's', true), new Card(3, 's', true), new Card(4, 's', true), new Card(5, 's', true), new Card(6, 's', true), new Card(7, 's', true), new Card(8, 's', true), new Card(9, 's', true), new Card(1, 'z'), new Card(2, 'z'),
    // new Card(5, 'p', true), new Card(6, 'm'), new Card(1, 's', true), new Card(2, 's', true), new Card(3, 's', true), new Card(4, 's', true), new Card(5, 's', true), new Card(6, 's', true), new Card(7, 's', true), new Card(8, 's', true), new Card(9, 's', true), new Card(3, 'z'), new Card(4, 'z'),
    // new Card(3, 'p', true), new Card(7, 'm'), new Card(1, 's', true), new Card(2, 's', true), new Card(3, 's', true), new Card(4, 's', true), new Card(5, 's', true), new Card(6, 's', true), new Card(7, 's', true), new Card(8, 's', true), new Card(9, 's', true), new Card(5, 'z'), new Card(6, 'z'),
    // new Card(2, 'm', true), new Card(8, 'm'), new Card(1, 'p', true), new Card(2, 'p', true), new Card(3, 'p', true), new Card(4, 'p', true), new Card(5, 'p', true), new Card(6, 'p', true), new Card(7, 'p', true), new Card(8, 'p', true), new Card(9, 'p', true), new Card(7, 'z'), new Card(6, 'z', true),
    // new Card(5, 'z', true), new Card(5, 'm', true), new Card(2, 'z', true), new Card(3, 'z', true), new Card(4, 'z', true), new Card(0, 'm', true), new Card(7, 'z', true), new Card(6, 'z', true), new Card(1, 'z', true), new Card(9, 'm', true), new Card(1, 'm', true), new Card(2, 'm', true), new Card(3, 'm', true),
    // ];
    // let retCard = tempDeck[this.i];
    // this.i++;
    // return retCard;
  };
};

module.exports = Deck;

// 使用示例
// const deck = new Deck(true); // 创建一个洗牌的牌组
// deck.Shuffle(); // 洗牌
// for (let card of deck.Cards) {
//   console.log(card.Value + card.Type + (card.Transparent ? ' (透明)' : ''));
// }