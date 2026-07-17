import { Server, Socket } from "socket.io";
import { RoomManager } from "../core/roomManager.js";
import {
  numberCheck,
  puxarCartaDaSala,
  gerarBaralhoNovo,
  freezePlayer,
  standPlayer,
  passarProximoTurno,
  encerrarRodada,
  processNumberCard,
  processSpecialCard,
  processFlipThreeCards,
  checkRoundEnd,
  checkUniqueCardsBonus,
  sanitizeRoom,
} from "../core/GameEngine.js";
import type { Card } from "../interfaces/Cards.js";

const SPECIAL_ACTION_LIST = ["x 2", "+ 2", "+ 4", "+ 6", "+ 8", "+ 10", "extra health"];

export function registerGameHandlers(io: Server, socket: Socket) {

  // ── Draw a card ───────────────────────────────────────────────
  socket.on("game:pull", async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const room = RoomManager.getRoom(roomId);
      if (!room) return socket.emit("game:error", "Sala não encontrada.");
      if (room.status !== "playing") return socket.emit("game:error", "Jogo não iniciado.");
      if (room.currentPlayer !== socket.id) return socket.emit("game:error", "Não é sua vez.");
      if (room.actionPendingFrom) {
        return socket.emit("game:error", `Aguardando ação de ${room.actionPendingFrom}.`);
      }

      if (room.deck.length < 1) room.deck = gerarBaralhoNovo();

      const card = puxarCartaDaSala(room) as Card;
      if (!card) return socket.emit("game:error", "Baralho vazio.");

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return socket.emit("game:error", "Jogador não encontrado.");

      const cardVal = card.value.toLowerCase().trim();

      // ── Freeze ──────────────────────────────────────────────
      if (cardVal === "freeze") {
        const others = room.players.filter((p) => p.inGame && p.id !== socket.id);
        if (others.length === 0) {
          freezePlayer(room, socket.id);
          io.to(roomId).emit("game:log", {
            message: `${player.username} não tinha alvos e se congelou!`,
          });
          if (checkRoundEnd(room)) {
            encerrarRodada(room, io);
            return;
          }
          passarProximoTurno(room);
          io.to(roomId).emit("game:updated", sanitizeRoom(room));
          return;
        }
        room.actionPendingFrom = socket.id;
        room.pendingActionType = "freeze";
        io.to(roomId).emit("game:action_pending", {
          action: "freeze",
          pulledBy: socket.id,
          pulledByUsername: player.username,
          targets: others.map((p) => ({ id: p.id, username: p.username })),
          message: `${player.username} puxou Freeze! Selecione um alvo.`,
        });
        RoomManager.saveRoom(roomId, room);
        return;
      }

      // ── Flip Three ──────────────────────────────────────────
      if (cardVal === "flip three") {
        const others = room.players.filter((p) => p.inGame && p.id !== socket.id);
        if (others.length === 0) {
          const result = processFlipThreeCards(room, player);
          io.to(roomId).emit("game:flip_three_result", {
            targetUsername: player.username,
            targetId: player.id,
            cards: result.cardResults,
          });
          if (player.inGame === false) {
            io.to(roomId).emit("game:log", {
              message: `${player.username} se aplicou Flip Three e foi eliminado!`,
            });
            if (checkRoundEnd(room)) {
              encerrarRodada(room, io);
              return;
            }
          }
          passarProximoTurno(room);
          io.to(roomId).emit("game:updated", sanitizeRoom(room));
          return;
        }
        room.actionPendingFrom = socket.id;
        room.pendingActionType = "flip_three";
        io.to(roomId).emit("game:action_pending", {
          action: "flip_three",
          pulledBy: socket.id,
          pulledByUsername: player.username,
          targets: others.map((p) => ({ id: p.id, username: p.username })),
          message: `${player.username} puxou Flip Three! Selecione um alvo para virar 3 cartas.`,
        });
        RoomManager.saveRoom(roomId, room);
        return;
      }

      // ── Number card ─────────────────────────────────────────
      if (numberCheck(card)) {
        const result = processNumberCard(player, card);

        if (result.eliminated) {
          io.to(roomId).emit("game:log", {
            message: `${player.username} tirou ${card.value} duplicada e foi eliminado!`,
          });
          if (checkRoundEnd(room)) {
            encerrarRodada(room, io);
            return;
          }
          passarProximoTurno(room);
          io.to(roomId).emit("game:updated", sanitizeRoom(room));
          return;
        }

        if (checkUniqueCardsBonus(player)) {
          io.to(roomId).emit("game:log", {
            message: `${player.username} atingiu 7 cartas numéricas únicas! Rodada encerrada com bônus!`,
          });
          encerrarRodada(room, io);
          return;
        }

        passarProximoTurno(room);
        io.to(roomId).emit("game:updated", sanitizeRoom(room));
        return;
      }

      // ── Special cards (+2, +4, +6, +8, +10, X2, extra health) ──
      if (SPECIAL_ACTION_LIST.includes(cardVal)) {
        processSpecialCard(player, card);
        io.to(roomId).emit("game:log", {
          message: `${player.username} puxou ${card.value}.`,
        });
        passarProximoTurno(room);
        io.to(roomId).emit("game:updated", sanitizeRoom(room));
        return;
      }

      // ── Fallback (shouldn't happen) ────────────────────────
      passarProximoTurno(room);
      io.to(roomId).emit("game:updated", sanitizeRoom(room));
    } catch (err: any) {
      socket.emit("game:error", err.message || "Erro ao puxar carta.");
    }
  });

  // ── Stand (stop drawing) ──────────────────────────────────────
  socket.on("game:stand", (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const room = RoomManager.getRoom(roomId);
      if (!room) return socket.emit("game:error", "Sala não encontrada.");
      if (room.status !== "playing") return socket.emit("game:error", "Jogo não iniciado.");
      if (room.currentPlayer !== socket.id) return socket.emit("game:error", "Não é sua vez.");
      if (room.actionPendingFrom) {
        return socket.emit("game:error", "Resolva a ação pendente antes de parar.");
      }

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return socket.emit("game:error", "Jogador não encontrado.");

      standPlayer(room, socket.id);
      io.to(roomId).emit("game:log", {
        message: `${player.username} parou de puxar cartas.`,
      });

      if (checkRoundEnd(room)) {
        encerrarRodada(room, io);
        return;
      }

      passarProximoTurno(room);
      io.to(roomId).emit("game:updated", sanitizeRoom(room));
    } catch (err: any) {
      socket.emit("game:error", err.message || "Erro ao parar.");
    }
  });

  // ── Player selected target for freeze / flip three ────────────
  socket.on(
    "game:player_selected",
    (data: { roomId: string; targetPlayerId: string }) => {
      try {
        const { roomId, targetPlayerId } = data;
        const actualPlayerId = socket.id;

        const room = RoomManager.getRoom(roomId);
        if (!room) return socket.emit("game:error", "Sala não encontrada.");
        if (room.actionPendingFrom !== actualPlayerId) {
          return socket.emit("game:error", "Não é a sua vez de selecionar um jogador.");
        }

        const puller = room.players.find((p) => p.id === actualPlayerId);
        const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
        if (!targetPlayer || !targetPlayer.inGame) {
          return socket.emit("game:error", "Jogador selecionado inválido ou fora de jogo.");
        }

        const actionType = room.pendingActionType;

        // ── Resolve Freeze ────────────────────────────────────
        if (actionType === "freeze") {
          freezePlayer(room, targetPlayer.id);
          io.to(roomId).emit("game:log", {
            message: `${puller?.username} congelou ${targetPlayer.username}!`,
          });
        }

        // ── Resolve Flip Three ────────────────────────────────
        if (actionType === "flip_three") {
          const result = processFlipThreeCards(room, targetPlayer);
          io.to(roomId).emit("game:flip_three_result", {
            targetUsername: targetPlayer.username,
            targetId: targetPlayer.id,
            pulledByUsername: puller?.username,
            cards: result.cardResults,
          });

          const wasEliminated = result.cardResults.some(
            (r) => r.effect === "busted" || r.effect === "freeze",
          );
          if (wasEliminated) {
            io.to(roomId).emit("game:log", {
              message: `${targetPlayer.username} foi eliminado durante o Flip Three de ${puller?.username}!`,
            });
          }
        }

        // ── Clear pending & advance turn ──────────────────────
        room.actionPendingFrom = undefined;
        room.pendingActionType = undefined;
        room.flipThreeTargetId = undefined;
        room.flipThreeCount = 0;

        if (checkRoundEnd(room)) {
          encerrarRodada(room, io);
          return;
        }

        passarProximoTurno(room);
        RoomManager.saveRoom(roomId, room);
        io.to(roomId).emit("game:updated", sanitizeRoom(room));
      } catch (error: any) {
        socket.emit("game:error", "Erro ao processar a seleção do jogador.");
      }
    },
  );
}
