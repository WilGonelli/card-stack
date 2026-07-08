import { Server, Socket } from "socket.io";
import { registerRoomHandlers } from "./roomHandler.js";
import { registerGameHandlers } from "./gameHandler.js";

export function initSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`Usuário conectado: ${socket.id}`);

    // Registra os módulos de eventos passando o socket e o io
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`Usuário desconectado: ${socket.id}`);
    });
  });
}
