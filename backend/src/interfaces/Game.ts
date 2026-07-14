import type { Card, Player } from "./index.js";

export interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: Player[];
  deck: Card[];
  currentTurnIndex: number;
  actionPendingFrom: string | undefined;
}
