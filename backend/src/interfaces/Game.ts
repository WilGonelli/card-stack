import type { Card, Player } from "./index.js";

export interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: Player[];
  deck: Card[];
  currentTurnIndex: number;
  currentRound: number;
  actionPendingFrom: string | undefined;
  currentPlayer: string | undefined;
}
