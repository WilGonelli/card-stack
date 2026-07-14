import type { Card, Player, GameRoom } from "../interfaces/index.js";
import { DECK } from "./CardEngine.js";
import { RoomManager } from "./roomManager.js";

export const gerarBaralhoNovo = () => {
  return [...DECK];
};

export const puxarCartaDaSala = (room: GameRoom) => {
  if (room.deck.length === 0) {
    room.deck = gerarBaralhoNovo();
  }
  const index = Math.floor(Math.random() * room.deck.length);
  return room.deck.splice(index, 1)[0];
};

export const passarProximoTurno = (room: GameRoom) => {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  return;
};

export const sumPoints = (deck: Card[], specialDeck: Card[]) => {
  let points = 0;
  let x2 = false;
  for (const card of deck) {
    points += Number(card.value);
  }
  for (const card of specialDeck) {
    if (card.value.toLowerCase() === "x 2") {
      x2 = true;
      continue;
    }
    if (card.value.toLowerCase() === "freeze") {
      return (points = 0);
    }
    if (card.value.toLowerCase() === "extra health") continue;
    points += Number(card.value.split(" ")[1]);
  }
  if (x2) points = points * 2;

  return points;
};

export const cardsCheck = (deck: Card[], card: Card) => {
  for (const c of deck) {
    if (c.value === card.value) {
      return true;
    }
  }
  return false;
};

export const numberCheck = (card: Card) => {
  return Number(card);
};
