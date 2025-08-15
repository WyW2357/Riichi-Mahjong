const Card = require('./card');

const Deck = function (washizu = false) {
  this.Cards = [];
  this.washizu = washizu;

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
  };
};

module.exports = Deck;

// 使用示例
// const deck = new Deck(true); // 创建一个洗牌的牌组
// deck.Shuffle(); // 洗牌
// for (let card of deck.Cards) {
//   console.log(card.Value + card.Type + (card.Transparent ? ' (透明)' : ''));
// }