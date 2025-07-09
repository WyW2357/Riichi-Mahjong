const Card = function (value, type) {
  this.Value = value; // 1-9(万/筒/索), 1-7(字牌), 0(红宝牌)
  this.Type = type; // 'm', 'p', 's', 'z'
};

module.exports = Card;
