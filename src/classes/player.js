const Player = function (playername, socket) {
  this.UserName = playername;
  this.Socket = socket;
  this.HandCards = [];
  this.OutCards = [];
  this.ShowCards = [];
  this.OSCards = [];
  this.DrawCard = '';
  this.Points = 25000;
  this.Position = 0;
  this.Status = '';

  //摸牌
  this.AddCard = (card) => {
    this.HandCards.push(card);
  };

  //理牌
  this.SortHandCards = () => {
    this.HandCards.sort((a, b) => {
      const typeOrder = { 'm': 0, 'p': 1, 's': 2, 'z': 3 };
      const aType = typeOrder[a.Type];
      const bType = typeOrder[b.Type];
      if (aType !== bType) {
        return aType - bType;
      }
      // 红宝牌（value=0）视为5.5
      const aValue = a.Value === 0 ? 5.5 : a.Value;
      const bValue = b.Value === 0 ? 5.5 : b.Value;
      return aValue - bValue;
    });
  };

  // 向玩家发送事件
  this.Emit = (eventName, data) => {
    this.Socket.emit(eventName, data);
  };
};

module.exports = Player; 