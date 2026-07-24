import { createContext, useContext, type Dispatch } from "react";
import type { GameState, GameAction } from "./state";
import type { Socket } from "socket.io-client";

export interface GameContextValue {
  state: GameState;
  socket: Socket | null;
  dispatch: Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProvider");
  return ctx;
}
