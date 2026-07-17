import type { Card, Player, GameRoom } from "../interfaces/index.js";
import { DECK } from "./CardEngine.js";
import { RoomManager } from "./roomManager.js";
import { Server } from "socket.io";

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
  const players = room.players;
  let nextIndex = (room.currentTurnIndex + 1) % players.length;

  // percorre até encontrar alguém ativo
  for (let i = 0; i < players.length; i++) {
    const candidate = players[nextIndex];
    if (candidate?.inGame && !candidate.isFrozen) {
      room.currentTurnIndex = nextIndex;
      return;
    }
    nextIndex = (nextIndex + 1) % players.length;
  }

  // se chegou aqui, ninguém está ativo → próxima rodada
  iniciarProximaRodada(room);
};

export const iniciarProximaRodada = (room: GameRoom) => {
  // exemplo: resetar flags, distribuir cartas, etc.
  room.currentRound += 1;
  room.players.forEach((p) => {
    p.inGame = true; // ou lógica específica
    p.isFrozen = false;
  });
  room.currentTurnIndex = 0; // começa de novo
};

export const encerrarRodada = (room: GameRoom, io: Server) => {
  const resultados = room.players.map((player) => {
    const pontos = sumPoints(player.cards, player.specialCards);
    player.points += pontos; // acumula no total
    player.cards = [];
    player.specialCards = [];
    player.inGame = true; // reset para próxima rodada
    player.isFrozen = false;
    return { id: player.id, username: player.username, pontos };
  });

  room.currentRound += 1;
  room.currentTurnIndex = 0;
  room.currentPlayer = room.players[0]?.id || undefined;

  io.to(room.roomCode).emit("game:round_end", {
    round: room.currentRound,
    resultados,
    message: `Rodada ${room.currentRound - 1} encerrada. Próxima rodada iniciada.`,
  });

  io.to(room.roomCode).emit("game:updated", room);
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
  return Number(card.value);
};

export const getNextActivePlayer = async (
  room: GameRoom,
  currentPlayerId: string,
) => {
  const players = room.players;
  const currentIndex = players.findIndex((p) => p.id === currentPlayerId);

  if (currentIndex === -1) return null;

  let nextIndex = (currentIndex + 1) % players.length;

  // Loop até encontrar alguém ativo ou voltar ao início
  for (let i = 0; i < players.length; i++) {
    const candidate = players[nextIndex];
    if (candidate && candidate.inGame) {
      return candidate.id;
    }
    nextIndex = (nextIndex + 1) % players.length;
  }

  // Se ninguém estiver ativo
  return null;
};

export const freezePlayer = (room: GameRoom, playerId: string) => {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.isFrozen = true;
  }
};

export const exitPlayer = (room: GameRoom, playerId: string) => {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.inGame = false;
  }
};
