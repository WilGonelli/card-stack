import type { Card, Player, GameRoom } from "../interfaces/index.js";
import { DECK } from "./CardEngine.js";
import { RoomManager } from "./roomManager.js";
import { Server } from "socket.io";

const RESHUFFLE_THRESHOLD = 20;
const UNIQUE_CARDS_TO_WIN_ROUND = 7;
const BONUS_POINTS = 15;
const WIN_SCORE = 200;

// ── Sanitize (strip sensitive data before sending to clients) ───

export const sanitizeRoom = (room: GameRoom) => {
  const { deck, discardPile, ...safe } = room;
  return safe;
};

// ── Deck Management ─────────────────────────────────────────────

export const gerarBaralhoNovo = (): Card[] => {
  return [...DECK];
};

const shuffleDeck = (deck: Card[]): void => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = temp;
  }
};

export const checkReshuffle = (room: GameRoom): void => {
  if (room.deck.length <= RESHUFFLE_THRESHOLD && room.discardPile.length > 0) {
    room.deck.push(...room.discardPile);
    room.discardPile = [];
    shuffleDeck(room.deck);
  }
};

export const puxarCartaDaSala = (room: GameRoom): Card | undefined => {
  if (room.deck.length === 0) {
    room.deck = gerarBaralhoNovo();
  }
  checkReshuffle(room);
  const index = Math.floor(Math.random() * room.deck.length);
  return room.deck.splice(index, 1)[0];
};

// ── Card Checks ─────────────────────────────────────────────────

export const numberCheck = (card: Card): boolean => {
  return !isNaN(Number(card.value)) && card.value.trim() !== "";
};

export const cardsCheck = (deck: Card[], card: Card): boolean => {
  return deck.some((c) => c.value === card.value);
};

const getExtraHealthIndex = (specialCards: Card[]): number => {
  return specialCards.findIndex(
    (c) => c.value.toLowerCase() === "extra health",
  );
};

const getUniqueNumberCount = (cards: Card[]): number => {
  const unique = new Set(
    cards.filter((c) => numberCheck(c)).map((c) => c.value),
  );
  return unique.size;
};

// ── Card Processing ─────────────────────────────────────────────

export const processNumberCard = (
  player: Player,
  card: Card,
): { eliminated: boolean; eliminatedBy: "duplicate" | undefined } => {
  if (cardsCheck(player.cards, card)) {
    const extraHealthIndex = getExtraHealthIndex(player.specialCards);
    if (extraHealthIndex !== -1) {
      player.specialCards.splice(extraHealthIndex, 1);
      return { eliminated: false, eliminatedBy: undefined };
    }
    player.inGame = false;
    player.eliminatedBy = "duplicate";
    return { eliminated: true, eliminatedBy: "duplicate" };
  }
  player.cards.push(card);
  return { eliminated: false, eliminatedBy: undefined };
};

export const processSpecialCard = (player: Player, card: Card): void => {
  player.specialCards.push(card);
};

export const processFlipThreeCards = (
  room: GameRoom,
  targetPlayer: Player,
): { cardResults: { card: Card; effect: string }[] } => {
  const cardResults: { card: Card; effect: string }[] = [];

  for (let i = 0; i < 3; i++) {
    const card = puxarCartaDaSala(room);
    if (!card) break;

    if (numberCheck(card)) {
      const result = processNumberCard(targetPlayer, card);
      if (result.eliminated) {
        cardResults.push({ card, effect: "busted" });
        break;
      }
      cardResults.push({ card, effect: "added" });
    } else {
      const val = card.value.toLowerCase().trim();
      if (val === "freeze") {
        freezePlayer(room, targetPlayer.id);
        cardResults.push({ card, effect: "freeze" });
        break;
      } else if (val === "flip three") {
        processSpecialCard(targetPlayer, card);
        cardResults.push({ card, effect: "stored" });
      } else {
        processSpecialCard(targetPlayer, card);
        cardResults.push({ card, effect: "stored" });
      }
    }
  }

  return { cardResults };
};

// ── Player Actions ──────────────────────────────────────────────

export const freezePlayer = (room: GameRoom, playerId: string): void => {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.isFrozen = true;
    player.inGame = false;
    player.eliminatedBy = "freeze";
  }
};

export const standPlayer = (room: GameRoom, playerId: string): void => {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.inGame = false;
    player.eliminatedBy = "stand";
  }
};

// ── Turn Management ─────────────────────────────────────────────

export const passarProximoTurno = (room: GameRoom): void => {
  const players = room.players;
  let nextIndex = (room.currentTurnIndex + 1) % players.length;

  for (let i = 0; i < players.length; i++) {
    const candidate = players[nextIndex];
    if (candidate?.inGame && !candidate.isFrozen) {
      room.currentTurnIndex = nextIndex;
      room.currentPlayer = candidate.id;
      return;
    }
    nextIndex = (nextIndex + 1) % players.length;
  }

  encerrarRodada(room, null as unknown as Server);
};

// ── Round End Check ─────────────────────────────────────────────

export const checkRoundEnd = (room: GameRoom): boolean => {
  const active = room.players.filter((p) => p.inGame && !p.isFrozen);
  return active.length === 0;
};

export const checkUniqueCardsBonus = (player: Player): boolean => {
  return getUniqueNumberCount(player.cards) >= UNIQUE_CARDS_TO_WIN_ROUND;
};

// ── Scoring ─────────────────────────────────────────────────────

export const sumPoints = (deck: Card[], specialDeck: Card[]): number => {
  let basePoints = 0;
  let bonusPoints = 0;
  let hasX2 = false;

  for (const card of deck) {
    const num = Number(card.value);
    if (!isNaN(num)) {
      basePoints += num;
    }
  }

  for (const card of specialDeck) {
    const val = card.value.toLowerCase().trim();
    if (val === "x 2") {
      hasX2 = true;
    } else if (val.startsWith("+")) {
      const num = Number(val.split(" ")[1]);
      if (!isNaN(num)) {
        bonusPoints += num;
      }
    }
  }

  return hasX2 ? basePoints * 2 + bonusPoints : basePoints + bonusPoints;
};

// ── Round Lifecycle ─────────────────────────────────────────────

const resetRoundState = (room: GameRoom): void => {
  room.actionPendingFrom = undefined;
  room.pendingActionType = undefined;
  room.flipThreeTargetId = undefined;
  room.flipThreeCount = 0;
};

export const encerrarRodada = (room: GameRoom, io: Server): void => {
  const resultados = room.players.map((player) => {
    let pontos = 0;
    let bonus = false;

    if (player.eliminatedBy !== "freeze" && player.eliminatedBy !== "duplicate") {
      pontos = sumPoints(player.cards, player.specialCards);
      if (checkUniqueCardsBonus(player)) {
        pontos += BONUS_POINTS;
        bonus = true;
      }
    }

    player.points += pontos;
    room.discardPile.push(...player.cards, ...player.specialCards);
    player.cards = [];
    player.specialCards = [];

    return {
      id: player.id,
      username: player.username,
      pontos,
      bonus,
      eliminatedBy: player.eliminatedBy,
    };
  });

  const winner = room.players.find((p) => p.points >= WIN_SCORE);
  if (winner) {
    room.status = "finished";
    if (io) {
      io.to(room.roomCode).emit("game:game_end", {
        winner: { id: winner.id, username: winner.username, points: winner.points },
        resultados,
        message: `${winner.username} venceu com ${winner.points} pontos!`,
      });
      io.to(room.roomCode).emit("game:updated", sanitizeRoom(room));
    }
    RoomManager.deleteRoom(room.roomCode);
    return;
  }

  room.currentRound += 1;
  room.currentTurnIndex = 0;
  room.currentPlayer = room.players[0]?.id;
  room.players.forEach((p) => {
    p.inGame = true;
    p.isFrozen = false;
    p.eliminatedBy = undefined;
  });
  resetRoundState(room);

  if (io) {
    io.to(room.roomCode).emit("game:round_end", {
      round: room.currentRound - 1,
      resultados,
      message: `Rodada ${room.currentRound - 1} encerrada.`,
    });
    io.to(room.roomCode).emit("game:updated", sanitizeRoom(room));
  }
};
