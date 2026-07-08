import type { GameRoom, Player } from "../interfaces/index.js";

const activeRooms: Record<string, GameRoom> = {};

export const RoomManager = {
  getRoom(roomId: string): GameRoom | undefined {
    return activeRooms[roomId];
  },

  saveRoom(roomId: string, roomData: GameRoom): void {
    activeRooms[roomId] = roomData;
  },

  deleteRoom(roomId: string): void {
    delete activeRooms[roomId];
  },

  getAllRooms(): Record<string, GameRoom> {
    return activeRooms;
  },

  addPlayerToRoom(roomId: string, player: Player): GameRoom {
    const room = activeRooms[roomId];

    if (!room) {
      throw new Error("Sala não encontrada");
    }

    if (room.status !== "waiting") {
      throw new Error("O jogo já começou nesta sala");
    }

    if (room.players.length >= 9) {
      throw new Error("A sala está cheia");
    }

    if (room.players.length < 1) {
      player.isHost = true;
    }

    const playerExists = room.players.some((p) => p.id === player.id);
    if (!playerExists) {
      room.players.push(player);
    }

    activeRooms[roomId] = room;

    return room;
  },
};
