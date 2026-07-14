import { Server, Socket } from "socket.io";
import { RoomManager } from "../core/roomManager.js";
import type { Player } from "../interfaces/index.js";

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on("room:join", (data: { roomId: string; playerName: string }) => {
    try {
      const { roomId, playerName } = data;

      const room = RoomManager.getRoom(roomId);
      if (!room) {
        return socket.emit("game:error", "Sala não encontrada.");
      }

      const newPlayer: Player = {
        id: socket.id,
        username: playerName,
        points: 0,
        cards: [],
        specialCards: [],
        inGame: false,
        isHost: room.players.length === 0,
        isFrozen: false,
      };

      const updatedRoom = RoomManager.addPlayerToRoom(roomId, newPlayer);

      socket.join(roomId);

      io.to(roomId).emit("room:updated", updatedRoom);

      console.log(`Jogador ${playerName} entrou na sala ${roomId}`);
    } catch (error: any) {
      socket.emit("room:error", error.message);
    }
  });

  socket.on("room:start", (data: { roomId: string; playerName: string }) => {
    try {
      const { roomId, playerName } = data;

      const room = RoomManager.getRoom(roomId);
      if (!room) {
        return socket.emit("game:error", "Sala não encontrada.");
      }

      if (room.players.length < 2) {
        return socket.emit("room:error", "Players insuficiente para inicio.");
      }

      room.status = "playing";
      room.players.map((player) => {
        player.inGame = true;
      });

      const updatedRoom = RoomManager.saveRoom(roomId, room);

      io.to(roomId).emit("room:updated", updatedRoom);

      console.log(`Jogador ${playerName} começou o jogo na sala ${roomId}`);
    } catch (error: any) {
      socket.emit("room:error", error.message);
    }
  });
}
