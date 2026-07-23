import { Server, Socket } from "socket.io";
import { RoomManager } from "../core/roomManager.js";
import { sanitizeRoom, startNextRound } from "../core/GameEngine.js";
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
        eliminatedBy: undefined,
      };

      const updatedRoom = RoomManager.addPlayerToRoom(roomId, newPlayer);

      socket.join(roomId);

      io.to(roomId).emit("room:updated", sanitizeRoom(updatedRoom));

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
      const host = room.players.find((p) => p.isHost);
      if (host?.id !== socket.id) {
        return socket.emit("room:error", "Somente o host pode iniciar o game.");
      }

      room.status = "playing";
      room.players.forEach((player) => {
        player.inGame = true;
        player.eliminatedBy = undefined;
      });
      room.currentPlayer = room.players[room.roundStarterIndex]?.id;
      room.currentTurnIndex = room.roundStarterIndex;
      room.currentRound = 1;
      room.confirmedPlayers = [];

      const updatedRoom = RoomManager.saveRoom(roomId, room);

      io.to(roomId).emit("room:updated", sanitizeRoom(updatedRoom));

      console.log(`Jogador ${playerName} começou o jogo na sala ${roomId}`);
    } catch (error: any) {
      socket.emit("room:error", error.message);
    }
  });

  socket.on("room:confirm_round", (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = RoomManager.getRoom(roomId);
      if (!room) return socket.emit("game:error", "Sala não encontrada.");
      if (room.status !== "waiting_confirm") {
        return socket.emit("game:error", "Não está aguardando confirmação.");
      }

      if (!room.confirmedPlayers.includes(socket.id)) {
        room.confirmedPlayers.push(socket.id);
      }

      const player = room.players.find((p) => p.id === socket.id);
      io.to(roomId).emit("game:log", {
        message: `${player?.username || "Jogador"} confirmou proxima rodada. (${room.confirmedPlayers.length}/${room.players.length})`,
      });

      if (room.confirmedPlayers.length >= room.players.length) {
        startNextRound(room, io);
      } else {
        io.to(roomId).emit("game:updated", sanitizeRoom(room));
      }
    } catch (error: any) {
      socket.emit("room:error", error.message);
    }
  });

  socket.on("room:leave", (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = RoomManager.getRoom(roomId);
      if (!room) return socket.emit("game:error", "Sala não encontrada.");

      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex === -1) return socket.emit("game:error", "Jogador não está na sala.");

      const player = room.players[playerIndex];
      if (!player) return socket.emit("game:error", "Jogador não encontrado.");
      const wasHost = player.isHost;

      room.players.splice(playerIndex, 1);
      socket.leave(roomId);

      if (room.players.length === 0) {
        RoomManager.deleteRoom(roomId);
        console.log(`Sala ${roomId} vazia, deletada.`);
        return;
      }

      if (wasHost) {
        room.players[0]!.isHost = true;
      }

      if (room.confirmedPlayers.includes(socket.id)) {
        room.confirmedPlayers = room.confirmedPlayers.filter((id) => id !== socket.id);
      }

      io.to(roomId).emit("game:log", {
        message: `${player.username} saiu da sala.`,
      });
      io.to(roomId).emit("room:updated", sanitizeRoom(room));

      console.log(`Jogador ${player.username} saiu da sala ${roomId}`);
    } catch (error: any) {
      socket.emit("room:error", error.message);
    }
  });
}
