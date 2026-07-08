import { Server, Socket } from "socket.io";
import { RoomManager } from "../core/roomManager.js";
import type { Player } from "../interfaces/index.js";

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on("room:join", (data: { roomId: string; playerName: string }) => {
    try {
      const { roomId, playerName } = data;

      const newPlayer: Player = {
        id: socket.id,
        username: playerName,
        points: 0,
        cards: [],
        inGame: false,
        isHost: false,
      };

      const updatedRoom = RoomManager.addPlayerToRoom(roomId, newPlayer);

      socket.join(roomId);

      io.to(roomId).emit("room:updated", updatedRoom);

      console.log(`Jogador ${playerName} entrou na sala ${roomId}`);
    } catch (error: any) {
      socket.emit("room:error", error.message);
    }
  });
}
