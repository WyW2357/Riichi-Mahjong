//测试用例
const JapaneseMaj = require("./js/japanesemaj.min.js");
var maj = new JapaneseMaj({
    changFeng: 1, // Number类型，东风场为1，南风场为2，西风场为3，北风场为4
	ziFeng: 1, // Number类型，自风，东1南2西3北4
	dora: [JapaneseMaj.getPai("Wanzi", 6)], //Array[Pai]类型，宝牌数组，注意这里是宝牌数组不是宝牌指示牌数组
	lidora: [JapaneseMaj.getPai("Wanzi", 1)], //Array[Pai]类型，里宝牌数组，注意这里是里宝牌数组不是里宝牌指示牌数组
    isLiangLiZhi: false, //是否两立直
    isLiZhi: false, //是否立直
    isYiFa: false, //是否一发
    isLingShang: false, //是否岭上
    isZimo: true, //是否自摸 
    isLast: false, //是否是河底/海底
    isQiangGang: false, //是否是抢杠
    isTianHe: false, //是否是天和
    isDiHe: false, //是否是地和
    isRenHe: false, //是否是人和
    isYanFan: false, //是否是燕返
    isGangZhen: false, //是否是杠振
    isGuYi: false, //是否是古役
    isLianFeng2Fu: false //连风牌雀头是否2符
});
// [JapaneseMaj.getPai("Tongzi", 2)]
var paixing = JapaneseMaj.getPaixingFromString('1p1p2p2p3p3p4p4p1z2z 5055m');//"1p2p3p4p0p6p7p8p9p6p6p 22222s"
var res = maj.getYakuCalculator(paixing);
if (res) {
    let pointRes = res.calcYaku(maj.state);
    let fan = pointRes.fan;
    let fu = pointRes.fu.fu;
    //console.log(pointRes);
    //console.log(pointRes.yaku[0].name);
    //console.log(fan + "番" + fu + "符");
    //console.log(pointRes.point);
    //console.log(pointRes.dora[1].pai.serialize());
    //console.log(JapaneseMaj.getPai("Tongzi", 1));
    //console.log(JapaneseMaj.getPaiFromAscii(35).serialize());// 0m
    //console.log(JapaneseMaj.getPaiFromAscii(36).serialize());// 0p
    //console.log(JapaneseMaj.getPaiFromAscii(18));// 0s
}
// var res = maj.calcXiangting(paixing);
// console.log(res);
 console.log(maj.calcXiangting(paixing).best.xiangTingCount);
// console.log(res.best.divideResult.map(x => x.serialize()));
// type：牌的种类，"Wanzi"为万子，"Tongzi"为筒子，"Suozi"为索子，"Feng"为风牌，"Sanyuan"为三元牌
// pai_ascii：牌的数字，如果是风牌那么东1南2西3北4，如果是三元牌那么白1发2中3