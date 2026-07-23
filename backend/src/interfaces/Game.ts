import type { Card, Player } from "./index.js";

export interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "waiting_confirm" | "finished";
  players: Player[];
  deck: Card[];
  currentTurnIndex: number;
  currentRound: number;
  roundStarterIndex: number;
  confirmedPlayers: string[];
  actionPendingFrom: string | undefined;
  pendingActionType: "freeze" | "flip_three" | undefined;
  flipThreeTargetId: string | undefined;
  flipThreeCount: number;
  currentPlayer: string | undefined;
  discardPile: Card[];
}
