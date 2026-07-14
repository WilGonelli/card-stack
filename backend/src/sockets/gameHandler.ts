// src/sockets/gameHandler.ts
import { Server, Socket } from "socket.io";
import { RoomManager } from "../core/roomManager.js";
import {
  cardsCheck,
  numberCheck,
  puxarCartaDaSala,
} from "../core/GameEngine.js";
import type { Card } from "../interfaces/Cards.js";

export function registerGameHandlers(io: Server, socket: Socket) {
  socket.on("game:pull", async (data: { roomId: string; playerId: string }) => {
    try {
      const { roomId, playerId } = data;

      // 1. Busca a sala no Core
      const room = RoomManager.getRoom(roomId);
      if (!room) {
        // ERRO DIRECIONADO: Usa apenas 'socket.emit' para falar só com quem disparou o evento
        return socket.emit("game:error", "Sala não encontrada.");
      }

      // 2. Executa a lógica pura do jogo (Simulação do seu Core)
      const card = puxarCartaDaSala(room) as Card;
      const isNumber = numberCheck(card);

      if (isNumber) {
        // Atualiza as cartas do jogador usando um find em vez de map (mais performático e legível)
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          player.cards.push(card);
        }

        // ATUALIZAÇÃO GERAL: Envia a sala atualizada para TODOS na sala
        io.to(roomId).emit("game:updated", room);
      }

      // 3. Verificação de Cartas de Ação (Freeze ou Flip Three)
      const cardValueLower = card.value.toLowerCase();
      if (cardValueLower === "freeze" || cardValueLower === "flip three") {
        // Filtra os jogadores ativos usando o seu filtro
        const activityPlayers = room.players.filter((p) => p.inGame);

        // EMIT CONDICIONAL E ESTRUTURADO:
        // Avisamos a sala INTEIRA que o jogo travou esperando uma ação do 'playerId'
        io.to(roomId).emit("game:action_pending", {
          action: cardValueLower,
          pulledBy: playerId, // Quem puxou a carta
          targets: activityPlayers, // Lista de alvos válidos
          message: `Aguardando ${playerId} selecionar um jogador para aplicar o ${card.value}.`,
        });
        room.actionPendingFrom = playerId;
        RoomManager.saveRoom(roomId, room);
      }
    } catch (err: any) {
      // Captura erros inesperados e avisa APENAS o jogador que causou
      socket.emit("game:error", err.message || "Erro ao puxar carta.");
    }
  });

  socket.on(
    "game:player_selected",
    (data: { roomId: string; targetPlayerId: string }) => {
      try {
        const { roomId, targetPlayerId } = data;

        // 1. Quem disparou o evento de verdade? Pegamos direto do socket físico!
        const actualPlayerId = socket.id;

        // 2. Busca a sala no Core
        const room = RoomManager.getRoom(roomId);
        if (!room) {
          return socket.emit("game:error", "Sala não encontrada.");
        }

        // 3. SEGURANÇA: Validar se quem mandou o evento é REALMENTE quem puxou a carta de ação
        // Para isso, sua sala precisa registrar de quem é a vez ou quem tem uma ação pendente.
        // Supondo que você salvou isso no estado da sala (ex: room.actionPendingFrom)
        if (room.actionPendingFrom !== actualPlayerId) {
          return socket.emit(
            "game:error",
            "Não é a sua vez de selecionar um jogador!",
          );
        }

        // 4. VALIDAÇÃO: O alvo escolhido é válido? (Está na sala e em jogo?)
        const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
        if (!targetPlayer || !targetPlayer.inGame) {
          return socket.emit(
            "game:error",
            "Jogador selecionado inválido ou fora de jogo.",
          );
        }

        // 5. CORE: Aplica o efeito da carta (Ex: Freeze)
        // Aqui você altera o estado do alvo no seu modelo de dados
        targetPlayer.isFrozen = true; // Exemplo de propriedade

        // 6. LIMPEZA: Remove a pendência da sala para o jogo continuar
        room.actionPendingFrom = undefined;

        // 7. ATUALIZAÇÃO GERAL: Avisa a sala inteira que o efeito foi aplicado e o jogo atualizou
        io.to(roomId).emit("game:updated", room);

        // Opcional: Enviar um log de texto para o chat do jogo saber o que aconteceu
        io.to(roomId).emit("game:log", {
          message: `${socket.id} congelou o jogador ${targetPlayer.username}!`,
        });
      } catch (error: any) {
        socket.emit("game:error", "Erro ao processar a seleção do jogador.");
      }
    },
  );
}
