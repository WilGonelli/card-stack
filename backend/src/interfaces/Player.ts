import type { Cards } from "./Cards.js";

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  points: number;
  inGame: boolean;
  cards: Cards[];
}
