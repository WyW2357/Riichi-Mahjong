const Player = function (playername, socket) {
  this.UserName = playername;
  this.Socket = socket;
  this.HandCards = [];
  this.RiverCards = [];
  this.ShowCards = [];        //副露：多种类型区分
  this.HistoryCards = [];
  this.DrawCard = '';
  this.Points = 25000;
  this.Position = 0;
  this.Status = '';   // WaitingCard WaitingAction WaitingSelect WaitingCardOrAction WaitingRiichi WaitingTsumoOrKan
  this.Options = [];
  this.IsRiichi = false;
  this.IsDoubleRiichi = false;
  this.IsYiFa = false;
  this.IsLingShang = false;
  this.TenPai = false;
  this.MachiHai = [];
  this.RiichiProcessed = false;
  this.Furiten = {
    discard: false,
    temporary: false,
    riichi: false,
  };

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

  // 移除一张牌
  this.RemoveCard = (card) => {
    for (let i = 0; i < this.HandCards.length; i++) {
      if (this.HandCards[i].Type === card.Type && this.HandCards[i].Value === card.Value) {
        this.HandCards.splice(i, 1);
        return;
      }
    }
  };

  this.CheckFuriten = () => this.Furiten.discard || this.Furiten.temporary || this.Furiten.riichi;
};

module.exports = Player; 