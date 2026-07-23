export interface Card {
  id: number;
  value: string;
}

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  points: number;
  inGame: boolean;
  cards: Card[];
  specialCards: Card[];
  isFrozen: boolean;
  eliminatedBy: "freeze" | "duplicate" | "stand" | undefined;
}

export interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "waiting_confirm" | "finished";
  players: Player[];
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

export interface RoundConfirmed {
  confirmedCount: number;
  totalCount: number;
}

export interface ActionPending {
  action: "freeze" | "flip_three";
  pulledBy: string;
  pulledByUsername: string;
  targets: { id: string; username: string }[];
  message: string;
}

export interface FlipThreeResult {
  targetUsername: string;
  targetId: string;
  pulledByUsername: string;
  cards: { card: Card; effect: string }[];
}

export interface RoundEnd {
  round: number;
  resultados: {
    id: string;
    username: string;
    pontos: number;
    bonus: boolean;
    eliminatedBy: string | undefined;
  }[];
  message: string;
}

export interface GameEnd {
  winner: Player;
  resultados: RoundEnd["resultados"];
  message: string;
}

export interface DuplicateInfo {
  playerId: string;
  playerUsername: string;
  cardValue: string;
  extraHealthUsed: boolean;
}

export type View = "lobby" | "room" | "game" | "round_end" | "game_end";
