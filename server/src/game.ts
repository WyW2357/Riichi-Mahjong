import Card from './Card.ts';
import Player, { type ShownCard } from './Player.ts';
import JapaneseMaj from './japanesemaj.min.cjs';


export class Game {
    Players: Player[];

    StageNum: number;
    RoundNum: number;
    RiichiBouNum: number;

    Deck: Card[];
    DoraIndicator: any[];
    LidoraIndicator: any[];
    RestCardsNum: number;

    ActivePosition: number;
    LastCutCard: { Card: Card; Player: Player; River: boolean };

    HaveAkadora: boolean;
    HaveKiriageMangan: boolean;
    HaveHakoshita: boolean;
    HaveNishiba: boolean;
    HaveDaburuYakuman: boolean;
    HaveDaburuKaze: boolean;
    HaveKuikae: boolean;


    constructor(haveAkadora: boolean, haveKiriageMangan: boolean, haveHakoshita: boolean, haveNishiba: boolean, haveDaburuYakuman: boolean, haveDaburuKaze: boolean, haveKuikae: boolean) {
        this.Players = [];

        this.StageNum = 1;
        this.RoundNum = 0;
        this.RiichiBouNum = 0;

        this.Deck = [];
        this.DoraIndicator = [];
        this.LidoraIndicator = [];
        this.RestCardsNum = 70;

        this.ActivePosition = 0;
        this.LastCutCard = { Card: null, Player: null, River: false };

        this.HaveAkadora = haveAkadora;
        this.HaveKiriageMangan = haveKiriageMangan;
        this.HaveHakoshita = haveHakoshita;
        this.HaveNishiba = haveNishiba;
        this.HaveDaburuYakuman = haveDaburuYakuman;
        this.HaveDaburuKaze = haveDaburuKaze;
        this.HaveKuikae = haveKuikae;
    }


    Shuffle() {
        this.Deck = [];

        let suits = ['m', 'p', 's'];
        for(let v = 1; v <= 9; v++) {
            for(let s = 0; s < suits.length; s++) {
                for(let i = 0; i < 4; i++) {
                    this.Deck.push(new Card(this.HaveAkadora && i === 0 && v === 5 ? 0 : v, suits[s]));
                }
            }
        }

        for(let v = 1; v <= 7; v++) {
            for(let i = 0; i < 4; i++) {
                this.Deck.push(new Card(v, 'z'));
            }
        }

        for (let i = this.Deck.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.Deck[i], this.Deck[j]] = [this.Deck[j], this.Deck[i]];
        }

        for (let i = 0; i < this.Players.length; i++) {
            for (let j = 0; j < 13; j++) {
                this.Players[i].AddCard(this.Deck[i * 13 + j]);
            }
            this.Players[i].SortHandCards();
        }

        this.DoraIndicator = [this.Deck[122]];
        this.LidoraIndicator = [this.Deck[123]];
        this.RestCardsNum = 70;
    }


    EmitToAllPlayers(eventName: string, data: any) {
        for (let p of this.Players) {
            p.Emit(eventName, data);
        }
    }


    NewRound() {
        for (let p of this.Players) {

            p.HandCards = [];
            p.DrawnCard = null;
            p.RiverCards = [];
            p.ShownCards = [];
            p.HistoryCards = [];

            p.IsRiichi = false;
            p.IsDoubleRiichi = false;
            p.IsYiFa = false;
            p.IsLingShang = false;
            p.Listening = [];
            p.Furiten = {
                Discard: false,
                Temporary: false,
                Riichi: false
            };
            p.Timer = [5, 20];
        }

        this.Shuffle();
        this.LastCutCard = { Card: null, Player: null, River: false };

        this.Draw(this.Players.find(p => p.Position === 0));
    }


    Draw(player: Player) {
        if (this.RestCardsNum === 0) {
            this.Ryuukyoku();
            return;
        }

        player.Furiten.Temporary = false;

        player.DrawnCard = this.Deck[122 - this.RestCardsNum--];

        let ankanOptions = this.AnkanCheck(player);

        let kakanOptions = this.KakanCheck(player);

        let tsumoOption = this.TsumoCheck(player);

        let options = [...ankanOptions, ...kakanOptions, ...tsumoOption];

        if (player.IsRiichi) {
            if (options.length > 0) {
                options.push({ Type: 'RiichiPass' });
            }
            else {
                setTimeout(() => {
                    this.Cut(player, player.DrawnCard, true);
                    return;
                }, 500);
            }
        }
        else {
            if (options.length > 0) {
                options.push({ Type: 'Pass' });
            }
            options.push({ Type: 'Cut', Names: [...new Set(player.HandCards.map(card => card.Value.toString() + card.Suit))] });
        }

        player.Options = options;

        this.Render(player);
    }


    Cut(player: Player, card: Card, Tsumogiri: boolean) {
        if (Tsumogiri) {
            player.DrawnCard = null;
        }
        else {
            player.RemoveCard(card);
        }

        player.Options = [];

        player.RiverCards.push(card);
        this.LastCutCard = { Card: card, Player: player, River: true };

        player.HistoryCards.push(card);

        player.IsYiFa = false;
        player.IsLingShang = false;

        if (player.Listening.length > 0 && player.Listening.some(listening => player.HistoryCards.some(historyCard => this.EqualCard(new Card(parseInt(listening[0]), listening[1]), historyCard)))) {
            player.Furiten.Discard = true;
            player.Furiten.Riichi = player.IsRiichi;
        }
        
        for (let p of this.Players) {
            if (p !== player) {
                let chiOptions = this.ChiCheck(p);

                let ponOptions = this.PonCheck(p);

                let minkanOptions = this.MinkanCheck(p);

                let ronOptions = this.RonCheck(p);

                let options = [...chiOptions, ...ponOptions, ...minkanOptions, ...ronOptions];

                if (options.length > 0) {
                    options.push({ Type: 'Pass' });
                }
                p.Options = options;
            }
        }

        if (this.Players.every(p => p.Options.length === 0)) {
            this.ActivePosition = (this.ActivePosition + 1) % 4;
            setTimeout(() => {
                this.Draw(this.Players.find(p => p.Position === this.ActivePosition));
                return;
            }, 500);
        }

        this.Render(null);
    }


    ChiCheck(player: Player) {
        if (player.IsRiichi || this.RestCardsNum === 0 || this.LastCutCard.Card.Suit === 'z' || (player.Position - this.LastCutCard.Player.Position + 4) % 4 !== 1) return [];

        let chiOptions = [];

        let chiValuesMap = {
            1: [[2, 3]],
            2: [[1, 3], [3, 4]],
            3: [[1, 2], [2, 4], [4, 0], [4, 5]],
            4: [[2, 3], [3, 0], [3, 5], [0, 6], [5, 6]],
            0: [[3, 4], [4, 6], [6, 7]],
            5: [[3, 4], [4, 6], [6, 7]],
            6: [[4, 0], [4, 5], [0, 7], [5, 7], [7, 8]],
            7: [[0, 6], [5, 6], [6, 8], [8, 9]],
            8: [[6, 7], [7, 9]],
            9: [[7, 8]]
        };

        for (let chiCombo of chiValuesMap[this.LastCutCard.Card.Value.toString()]) {
            if (player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === chiCombo[0]) && player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === chiCombo[1])) {
                if (!this.HaveKuikae) {
                    let canCutCards = player.HandCards.filter(card => card.Suit !== this.LastCutCard.Card.Suit || !(chiValuesMap[card.Value.toString()].includes(chiCombo)));
                    if (canCutCards.length > 0) {
                        chiOptions.push('h' + this.LastCutCard.Card.Value.toString() + chiCombo.join('') + this.LastCutCard.Card.Suit);
                    }
                }
                else {
                    chiOptions.push('h' + this.LastCutCard.Card.Value.toString() + chiCombo.join('') + this.LastCutCard.Card.Suit);
                }
            }
        }

        return chiOptions.length > 0 ? [{ Type: 'Chi', Names: chiOptions }] : [];
    }


    PonCheck(player: Player) {
        if (player.IsRiichi || this.RestCardsNum === 0) return [];
        
        let ponOptions = [];

        let ponValuesMap = {
            1: [[1, 1]],
            2: [[2, 2]],
            3: [[3, 3]],
            4: [[4, 4]],
            0: [[5, 5]],
            5: [[0, 5], [5, 5]],
            6: [[6, 6]],
            7: [[7, 7]],
            8: [[8, 8]],
            9: [[9, 9]],
        };

        for (let ponCombo of ponValuesMap[this.LastCutCard.Card.Value.toString()]) {
            if (player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === ponCombo[0]) && player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === ponCombo[1])) {
                let ponName = '';
                switch ((player.Position - this.LastCutCard.Player.Position + 4) % 4) {
                    case 1:
                        ponName = 'h' + this.LastCutCard.Card.Value.toString() + ponCombo.join('') + this.LastCutCard.Card.Suit;
                        break;
                    case 2:
                        ponName = ponCombo[0].toString() + 'h' + this.LastCutCard.Card.Value.toString() + ponCombo[1].toString() + this.LastCutCard.Card.Suit;
                        break;
                    case 3:
                        ponName = ponCombo.join('') + 'h' + this.LastCutCard.Card.Value.toString() +  this.LastCutCard.Card.Suit;
                        break;
                    default:
                        break;
                }
                ponOptions.push(ponName);
            }
        }

        return ponOptions.length > 0 ? [{ Type: 'Pon', Names: ponOptions }] : [];
    }


    MinkanCheck(player: Player) {
        if (player.IsRiichi || this.RestCardsNum === 0 || this.DoraIndicator.length === 5) return [];

        let minkanOption = [];

        let minkanValuesMap = {
            1: [[1, 1, 1]],
            2: [[2, 2, 2]],
            3: [[3, 3, 3]],
            4: [[4, 4, 4]],
            0: [[5, 5, 5]],
            5: [[0, 5, 5], [5, 5, 5]],
            6: [[6, 6, 6]],
            7: [[7, 7, 7]],
            8: [[8, 8, 8]],
            9: [[9, 9, 9]],
        };

        for (let minkanCombo of minkanValuesMap[this.LastCutCard.Card.Value.toString()]) {
            if (player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === minkanCombo[0]) && player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === minkanCombo[1]) && player.HandCards.some(card => card.Suit === this.LastCutCard.Card.Suit && card.Value === minkanCombo[2])) {
                let minkanName = '';
                switch ((player.Position - this.LastCutCard.Player.Position + 4) % 4) {
                    case 1:
                        minkanName = 'h' + this.LastCutCard.Card.Value.toString() + minkanCombo.join('') + this.LastCutCard.Card.Suit;
                        break;
                    case 2:
                        minkanName = minkanCombo[0].toString() + 'h' + this.LastCutCard.Card.Value.toString() + minkanCombo[1].toString() + minkanCombo[2].toString() + this.LastCutCard.Card.Suit;
                        break;
                    case 3:
                        minkanName = minkanCombo.join('') + 'h' + this.LastCutCard.Card.Value.toString() +  this.LastCutCard.Card.Suit;
                        break;
                    default:
                        break;
                }
                minkanOption.push(minkanName);
            }
        }

        return minkanOption.length > 0 ? [{ Type: 'Minkan', Name: minkanOption }] : [];
    }


    AnkanCheck(player: Player) {
        if (this.RestCardsNum === 0 || this.DoraIndicator.length === 5) return [];

        let options = [];
     
        if (player.IsRiichi) {
            if (player.HandCards.filter(card => this.EqualCard(card, player.DrawnCard)).length < 3) return [];

            let newhandCards = player.HandCards.filter(card => !this.EqualCard(card, player.DrawnCard));
            let newShownCards = player.ShownCards.slice();

            let ankanName = '';
            if (this.HaveAkadora && player.DrawnCard.Suit !== 'z' && (player.DrawnCard.Value === 5 || player.DrawnCard.Value === 0)) {
                ankanName = '5055' + player.DrawnCard.Suit;
            }
            else{
                ankanName = player.DrawnCard.Value.toString().repeat(4) + player.DrawnCard.Suit;
            }

            let newShownCard: ShownCard = {
                Type: 'Ankan',
                Name: ankanName,
                Cards: [player.DrawnCard, ...player.HandCards.filter(card => this.EqualCard(card, player.DrawnCard))]
            };
            newShownCards.push(newShownCard);

            let newCardsString = this.CardsToString(newhandCards, null, newShownCards);
            let maj = new JapaneseMaj();
            let paixing = JapaneseMaj.getPaixingFromString(newCardsString);
            if (maj.calcXiangting(paixing).best.xiangTingCount > 0) return [];

            let newListening = this.GetListening(newhandCards, newShownCards);
            if (newListening.length !== player.Listening.length || !newListening.every((card, index) => card === player.Listening[index])) return [];

            options.push({ Type: 'Ankan', Name: newShownCard.Name });
        }
        else {
            let suitsMap = {};
            for (let card of [player.DrawnCard, ...player.HandCards]) {
                if (!suitsMap[card.Suit]) {
                    suitsMap[card.Suit] = [];
                }
                suitsMap[card.Suit].push(card);
            }

            for (let suit in suitsMap) {
                let cards: Card[] = suitsMap[suit];

                if (this.HaveAkadora) {
                    let zeroes = cards.filter(card => card.Value === 0);
                    let fives = cards.filter(card => card.Value === 5);
                    if (zeroes.length == 1 && fives.length == 3) {
                        options.push({ Type: 'Ankan', Name: '5055' + suit });
                    }
                }

                let valueMap = {};
                for (let card of cards) {
                    if (!valueMap[card.Value]) {
                        valueMap[card.Value] = 0;
                    }
                    valueMap[card.Value]++;
                }

                for (let value in valueMap) {
                    if (valueMap[value] === 4) {
                        options.push({ Type: 'Ankan', Name: value.toString().repeat(4) + suit });
                    }
                }
            }
        }

        return options;
    }


    KakanCheck(player: Player) {
        if (player.IsRiichi || this.RestCardsNum === 0 || this.DoraIndicator.length === 5 || !player.ShownCards.some(card => card.Type === 'Pon')) return [];

        let options = [];
        
        for (let shown of player.ShownCards) {
            if (shown.Type === 'Pon' && player.HandCards.some(card => this.EqualCard(card, shown.Cards[0]))) {
                options.push({ Type: 'Kakan', Name: shown.Name.slice(0, 4) + '_' + this.LastCutCard.Card.Value.toString() + shown.Cards[0].Suit });
            }
        }

        return options;
    }


    TsumoCheck(player: Player) {
        let dora = this.DoraIndicator.map(card => JapaneseMaj.getPaiFromAscii(this.GetDoraASCII(card)));
        let lidora = this.LidoraIndicator.map(card => JapaneseMaj.getPaiFromAscii(this.GetDoraASCII(card)));

        let maj = new JapaneseMaj({
            changFeng: this.StageNum <= 4 ? 1 : this.StageNum <= 8 ? 2 : 3,
            ziFeng: player.Position + 1,
            dora: dora,
            lidora: player.IsRiichi ? lidora : [],
            isLiangLiZhi: player.IsDoubleRiichi,
            isLiZhi: player.IsRiichi,
            isYiFa: player.IsYiFa,
            isLingShang: player.IsLingShang,
            isZimo: true,
            isLast: this.RestCardsNum == 0 && !player.IsLingShang,
            isQiangGang: false,
            isTianHe: this.Players.every(p => p.ShownCards.length === 0) && player.HistoryCards.length === 0 && player.Position == 0,
            isDiHe: this.Players.every(p => p.ShownCards.length === 0) && player.HistoryCards.length === 0 && player.Position !== 0,
            isRenHe: false,
            isYanFan: false,
            isGangZhen: false,
            isGuYi: false,
            isLianFeng2Fu: !this.HaveDaburuKaze
        });
        let cardsString = this.CardsToString(player.HandCards, player.DrawnCard, player.ShownCards);
        let paixing = JapaneseMaj.getPaixingFromString(cardsString);
        let res = maj.getYakuCalculator(paixing);

        return res ? [{ Type: 'Tsumo' }] : [];
    }


    RonCheck(player: Player) {
        if (player.Furiten.Discard || player.Furiten.Temporary || player.Furiten.Riichi) return [];

        let dora = this.DoraIndicator.map(card => JapaneseMaj.getPaiFromAscii(this.GetDoraASCII(card)));
        let lidora = this.LidoraIndicator.map(card => JapaneseMaj.getPaiFromAscii(this.GetDoraASCII(card)));

        let maj = new JapaneseMaj({
            changFeng: this.StageNum <= 4 ? 1 : this.StageNum <= 8 ? 2 : 3,
            ziFeng: player.Position + 1,
            dora: dora,
            lidora: player.IsRiichi ? lidora : [],
            isLiangLiZhi: player.IsDoubleRiichi,
            isLiZhi: player.IsRiichi,
            isYiFa: player.IsYiFa,
            isZimo: false,
            isLast: this.RestCardsNum === 0,
            isQiangGang: !this.LastCutCard.River,
            isTianHe: false,
            isDiHe: false,
            isRenHe: false,
            isYanFan: false,
            isGangZhen: false,
            isGuYi: false,
            isLianFeng2Fu: !this.HaveDaburuKaze
        });
        let cardsString = this.CardsToString(player.HandCards, this.LastCutCard.Card, player.ShownCards);
        let paixing = JapaneseMaj.getPaixingFromString(cardsString);
        let res = maj.getYakuCalculator(paixing);

        return res ? [{ Type: 'Ron' }] : [];
    }


    Render(player: Player | null) {
        // Implement the logic for rendering the game state here
    }


    Ryuukyoku() {
        // Implement the logic for handling a draw (Ryuukyoku) here
    }


    GetListening(handCards: Card[], shownCards: ShownCard[]) {
        let listening: string[] = [];

        let cardsList = [
            '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
            '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
            '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
            '1z', '2z', '3z', '4z', '5z', '6z', '7z'
        ];
        for (let card of cardsList) {
            let cardsString = this.CardsToString(handCards, new Card(parseInt(card[0]), card[1]), shownCards);
            let maj = new JapaneseMaj();
            let paixing = JapaneseMaj.getPaixingFromString(cardsString);
            if (maj.calcXiangting(paixing).best.xiangTingCount > 0) continue;
            listening.push(card);
        }

        return listening;
    }


    CardsToString(handCards: Card[], drawCard: Card, shownCards: ShownCard[]) {
        let cardsList: string[] = [];

        cardsList.push(handCards.map(card => card.Value.toString() + card.Suit).join(''));

        if (drawCard) {
            cardsList[0] += drawCard.Value.toString() + drawCard.Suit;
        }

        for (let shown of shownCards) {
            if (shown.Type === 'Chi' || shown.Type === 'Pon') {
                cardsList.push(shown.Cards[0].Value.toString() + shown.Cards[1].Value.toString() + shown.Cards[2].Value.toString() + shown.Cards[0].Suit);
            }
            else if (shown.Type === 'Minkan' || shown.Type === 'Kakan') {
                if (shown.Cards.some(card => (card.Value === 5 || card.Value === 0) && card.Suit !== 'z')) {
                    cardsList.push('5055' + shown.Cards[0].Suit);
                }
                else {
                    cardsList.push(shown.Cards[0].Value.toString().repeat(4) + shown.Cards[0].Suit);
                }
            }
            else if (shown.Type === 'Ankan') {
                if (shown.Cards.some(card => (card.Value === 5 || card.Value === 0) && card.Suit !== 'z')) {
                    cardsList.push('55055' + shown.Cards[0].Suit);
                }
                else {
                    cardsList.push(shown.Cards[0].Value.toString().repeat(5) + shown.Cards[0].Suit);
                }
            }
        }

        return cardsList.join(' ');
    }


    EqualCard(card1: Card, card2: Card) {
        return card1.Suit === card2.Suit && (card1.Value === card2.Value || (this.HaveAkadora && ((card1.Value === 0 && card2.Value === 5) || (card1.Value === 5 && card2.Value === 0))));
    }


    GetDoraASCII(card: Card) {
        if (card.Value === 0 && card.Suit === 'm') return 5;
        if (card.Value === 0 && card.Suit === 'p') return 14;
        if (card.Value === 0 && card.Suit === 's') return 23;
        if (card.Suit === 'm') return card.Value % 9;
        if (card.Suit === 'p') return card.Value % 9 + 9;
        if (card.Suit === 's') return card.Value % 9 + 18;
        if (card.Suit === 'z') {
            if (card.Value === 1) return 28;
            if (card.Value === 2) return 29;
            if (card.Value === 3) return 30;
            if (card.Value === 4) return 27;
            if (card.Value === 5) return 32;
            if (card.Value === 6) return 33;
            if (card.Value === 7) return 31;
        }
    }


    Test() {
        let handCards: Card[] = [
            new Card(1, 'm'), new Card(2, 'm'), new Card(3, 'm'), new Card(4, 'm'), new Card(5, 'm'), new Card(6, 'm'), new Card(7, 'm'), new Card(8, 'm'), new Card(9, 'm'), new Card(4, 'p')
        ];

        let drawCard: Card = new Card(4, 'p');

        let shownCards: ShownCard[] = [
            {
                Type: 'Ankan',
                Name: 'Ankan',
                Cards: [new Card(1, 'p'), new Card(1, 'p'), new Card(1, 'p'), new Card(1, 'p')]
            }
        ];

        let maj = new JapaneseMaj({
            changFeng: this.StageNum <= 4 ? 1 : this.StageNum <= 8 ? 2 : 3,
            ziFeng: 1,
            dora: [],
            lidora: [],
            isLiangLiZhi: false,
            isLiZhi: false,
            isYiFa: false,
            isLingShang: false,
            isZimo: true,
            isLast: false,
            isQiangGang: false,
            isTianHe: false,
            isDiHe: false,
            isRenHe: false,
            isYanFan: false,
            isGangZhen: false,
            isGuYi: false,
            isLianFeng2Fu: true
        });
        let cardsString = this.CardsToString(handCards, drawCard, shownCards);
        let paixing = JapaneseMaj.getPaixingFromString(cardsString);
        let res = maj.getYakuCalculator(paixing);

        console.log(cardsString);
        console.log(res);
    }
}
export default Game;