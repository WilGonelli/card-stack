// src/sockets/gameHandler.ts
import { Server, Socket } from "socket.io";
import { DECK } from "../core/CardEngine.js";

export function registerGameHandlers(io: Server, socket: Socket) {
  socket.on("game:play_card", (data) => {
    // 1. Recebe o evento
    // 2. Chama a regra de negócio no /core
    // 3. Emite o resultado de volta
    io.to(data.roomId).emit("game:updated", {
      /* dados atualizados */
    });
  });
}
