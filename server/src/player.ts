import WebSocket from 'ws';

import Card from './Card.ts';

export interface ShownCard {
    Type: string;
    Name: string;
    Cards: Card[];
}

export class Player {
    Name: string;
    WebSocket: WebSocket;

    Position: number;
    Points: number;
    Options: any;

    HandCards: Card[];
    DrawnCard: Card;
    RiverCards: Card[];
    ShownCards: ShownCard[];
    HistoryCards: Card[];
    
    IsRiichi: boolean;
    IsDoubleRiichi: boolean;
    IsYiFa: boolean;
    IsLingShang: boolean;
    Listening: String[];
    Furiten: { [key: string]: boolean };
    Timer: [number, number];


    constructor(name: string, socket: WebSocket) {
        this.Name = name;
        this.WebSocket = socket;

        this.Position = -1;
        this.Points = 25000;
        this.Options = [];

        this.HandCards = [];
        this.DrawnCard = null;
        this.RiverCards = [];
        this.ShownCards = [];
        this.HistoryCards = [];
        
        this.IsRiichi = false;
        this.IsDoubleRiichi = false;
        this.IsYiFa = false;
        this.IsLingShang = false;
        this.Listening = [];
        this.Furiten = {
            Discard: false,
            Temporary: false,
            Riichi: false
        };
        this.Timer = [0, 0];
    }


    AddCard(card: Card) {
        this.HandCards.push(card);
    }


    RemoveCard(card: Card) {
        for (let i = 0; i < this.HandCards.length; i++) {
            if (this.HandCards[i].Value === card.Value && this.HandCards[i].Suit === card.Suit) {
                this.HandCards.splice(i, 1);
                return;
            }
        }
    }


    SortHandCards() {
        this.HandCards.sort((a, b) => {
            let suitsOrder = { 'm': 0, 'p': 1, 's': 2, 'z': 3 };
            let aSuit = suitsOrder[a.Suit];
            let bSuit = suitsOrder[b.Suit];
            if (aSuit !== bSuit) return aSuit - bSuit;

            let aValue = a.Value === 0 ? 4.5 : a.Value;
            let bValue = b.Value === 0 ? 4.5 : b.Value;
            return aValue - bValue;
        });
    }


    Emit(eventName: string, data: any) {
        this.WebSocket.send(JSON.stringify({ event: eventName, data }));
    }
};
export default Player;