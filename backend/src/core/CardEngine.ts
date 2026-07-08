import type { Card } from "../interfaces/Cards.js";

export const DECK: Card[] = [];

function InitDeck() {
  const cardConfig: { type: string; count: number }[] = [
    { type: "0", count: 1 },
    { type: "1", count: 1 },
    { type: "2", count: 2 },
    { type: "3", count: 3 },
    { type: "4", count: 4 },
    { type: "5", count: 5 },
    { type: "6", count: 6 },
    { type: "7", count: 7 },
    { type: "8", count: 8 },
    { type: "9", count: 9 },
    { type: "10", count: 10 },
    { type: "11", count: 11 },
    { type: "12", count: 12 },
    { type: "freeze", count: 4 },
    { type: "extra heart", count: 2 },
    { type: "flip three", count: 3 },
    { type: "+ 2", count: 2 },
    { type: "+ 4", count: 2 },
    { type: "+ 6", count: 2 },
    { type: "+ 8", count: 2 },
    { type: "+ 10", count: 2 },
    { type: "X 2", count: 2 },
  ];

  let currentId = 0;

  for (const config of cardConfig) {
    for (let j = 0; j < config.count; j++) {
      DECK.push({ id: currentId, value: config.type });
      currentId++;
    }
  }
}

InitDeck();
