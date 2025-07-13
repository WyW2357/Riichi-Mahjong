import TableForSearch from '../data/TableForSearch.js';

function calculate_fan_fu(
    self_hands,        //手牌: Array[Cards] 不包括和牌
    show_hands,        //副露区牌: Array[Array[Cards] (待定) ]
    winning_tile,      //和牌: Cards
    to_player,         //和牌玩家: 0,1,2,3
    from_player,       //放铳玩家: 0,1,2,3
    round_wind,        //场风: 1(E),2(S),3(W),4(N)
    player_wind,       //自风: 1(E),2(S),3(W),4(N)
    is_tsumo,          //是否自摸: bool(包括双立直)
    is_riichi,         //是否立直: bool
    is_daburu_riichi,  //是否双立直: bool
    is_ippatsu,        //是否一发: bool
    is_rinshan,        //是否岭上: bool
    is_chankan,        //是否抢杠: bool
    is_last_tile,      //是否海底或河底: bool
    is_first_tsumo,    //是否第一巡自摸: bool
    dora,              //宝牌指示牌: Array[Cards]
    ura_dora,          //里宝牌指示牌: Array[Cards]
) {
    // 检查手牌数量
    let hands_count = self_hands.length + show_hands.length * 3;
    if (hands_count !== 13) {
        throw new Error("手牌数量错误！");
    }

    // 手牌基本情况
    let menzen = true; // 是否门前清
    if (show_hands.length > 0)
        menzen = false;

    // 手牌拆解遍历

    let fans = 0;
    let fans_list = [];
    // 计算役满番数

    // 若有役满役，则返回役满番数
    if (fans !== 0)
        return fans;

    // 计算非役满番数

}