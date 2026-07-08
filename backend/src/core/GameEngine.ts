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
