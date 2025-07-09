const Card = require('./card');

const Deck = function() {
  this.Cards = [];

  //创建136张初始手牌
  this.Shuffle = () => {
    for(let v = 1; v <= 9; v++) {
      for(let i = 1;i <= 4;i++) {
        if(i === 1 && v === 5) {
          this.Cards.push(new Card(0, 'm'));
        } else {
          this.Cards.push(new Card(v, 'm'));
        }
      }
      for(let i = 1;i <= 4;i++) {
        if(i === 1 && v === 5) {
          this.Cards.push(new Card(0, 'p'));
        } else {
          this.Cards.push(new Card(v, 'p'));
        }
      }
      for(let i = 1;i <= 4;i++) {
        if(i === 1 && v === 5) {
          this.Cards.push(new Card(0, 's'));
        } else {
          this.Cards.push(new Card(v, 's'));
        }
      }
    }
    for(let v = 1;v <= 7;v++) {
      for(let i = 1;i <= 4;i++) {
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