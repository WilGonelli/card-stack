import type { Card, Player } from "./index.js";

export interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: Player[];
  deck: Card[];
  currentTurnIndex: number;
  currentRound: number;
  actionPendingFrom: string | undefined;
  pendingActionType: "freeze" | "flip_three" | undefined;
  flipThreeTargetId: string | undefined;
  flipThreeCount: number;
  currentPlayer: string | undefined;
  discardPile: Card[];
}
