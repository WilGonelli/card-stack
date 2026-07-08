import type { Cards, Player } from "./index.js";

export interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: Player[];
  deck: Cards[];
  currentTurnIndex: number;
}
