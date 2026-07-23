import type { Request, Response } from "express";
import type { GameRoom } from "../interfaces/Game.js";
import { RoomManager } from "../core/roomManager.js";

export const CreateRoom = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    const newActiveRoom: GameRoom = {
      roomCode,
      status: "waiting",
      players: [],
      deck: [],
      currentTurnIndex: 0,
      roundStarterIndex: 0,
      confirmedPlayers: [],
      actionPendingFrom: undefined,
      pendingActionType: undefined,
      flipThreeTargetId: undefined,
      flipThreeCount: 0,
      currentPlayer: undefined,
      currentRound: 0,
      discardPile: [],
    };

    RoomManager.saveRoom(roomCode, newActiveRoom);

    console.log(`Sala ${roomCode} criada por ${username} via HTTP`);
    res.status(201).json({ roomCode });
  } catch (err) {
    console.log(err);
  }
};
