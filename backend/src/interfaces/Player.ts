import type { Card } from "./Cards.js";

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  points: number;
  inGame: boolean;
  cards: Card[];
}
