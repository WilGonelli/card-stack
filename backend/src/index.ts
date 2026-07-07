import { startCards, CARDS_COMPLETE } from "./core/domain/Cards.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

startCards();

// ==========================================
// INTERFACES E CONFIGURAÇÃO DE ESTADO (MEMÓRIA)
// ==========================================

interface Player {
  id: string;
  username: string;
  isHost: boolean;
  points: number;
  inGame: boolean;
  cards: any[]; // As cartas que este jogador tem na mão
}

interface GameRoom {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: Player[];
  deck: any[];
  currentTurnIndex: number; // Guarda a posição (0, 1, 2...) de quem está jogando agora
}

// Onde todas as salas ativas ficarão guardadas na memória do Node
const activeRooms: Record<string, GameRoom> = {};

// ==========================================
// CONFIGURAÇÃO DO SERVIDOR EXPRESS + SOCKET.IO
// ==========================================

const app = express();
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Endpoint HTTP tradicional para CRIAR a sala de forma limpa na memória
app.post("/api/rooms", (req, res) => {
  const { username } = req.body;

  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

  // Inicializa a sala vazia na memória global
  activeRooms[roomCode] = {
    roomCode,
    status: "waiting",
    players: [],
    deck: [],
    currentTurnIndex: 0,
  };

  console.log(`Sala ${roomCode} criada por ${username} via HTTP`);
  console.log(activeRooms);
  res.status(201).json({ roomCode });
});

//===========================================
// FUNÇÕES UTEIS
//===========================================

// ==========================================
// GERENCIADOR DE CONEXÕES WEBSOCKET
// ==========================================

io.disconnectSockets(true);

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  // ------------------------------------------
  // FUNÇÕES AUXILIARES DE JOGO
  // ------------------------------------------

  const gerarBaralhoNovo = () => {
    return [...CARDS_COMPLETE];
  };
  const checkCards = (card: any, player: any, roomCode: any) => {
    if (Number(card.value)) player.points += Number(card.value);
    if (card.value === "flip three") flipThreeCards(player, roomCode);
    console.log(player);
  };

  const flipThreeCards = (player: any, roomCode: any) => {
    const room = activeRooms[roomCode];
    const playersActivity = room?.players.filter((player) => player.inGame);
    io.to(roomCode).emit("flip_three", {
      message:
        "O jogador tirou a carta flip three, selecione um oponente para virar 3 cartas",
      currentTurn: player.username,
      players: playersActivity,
    });
  };

  const puxarCartaDaSala = (room: GameRoom) => {
    if (room.deck.length === 0) {
      room.deck = gerarBaralhoNovo();
    }
    const index = Math.floor(Math.random() * room.deck.length);
    return room.deck.splice(index, 1)[0];
  };

  const passarProximoTurno = (room: GameRoom, ioServer: any) => {
    // Avança o índice. Se chegar no fim da lista, volta para o 0 (Loop circular)
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

    const proximoJogador = room.players[room.currentTurnIndex];

    ioServer.to(room.roomCode).emit("game:turn_changed", {
      currentTurn: proximoJogador?.username,
      message: `Agora é a vez de ${proximoJogador?.username} jogar!`,
    });
  };

  // Lógica temporária: ajustável conforme as regras do seu Flip 7
  const checarSeEstourou = (cards: any[]) => {
    // Exemplo genérico: Se você quiser limitar por número de cartas ou valor
    // No Flip 7 real, aqui você verifica se a nova carta puxada tem o mesmo valor de alguma na mão
    return cards.length > 5;
  };

  // ------------------------------------------
  // OUVINTES DE EVENTOS (LISTENERS)
  // ------------------------------------------

  // Evento: Entrar na sala
  socket.on(
    "join_game_room",
    (data: { roomCode: string; username: string }) => {
      const { roomCode, username } = data;
      const room = activeRooms[roomCode];

      if (!room) {
        return socket.emit("room_error", { message: "Sala não encontrada!" });
      }

      if (room.status === "playing") {
        return socket.emit("room_error", {
          message: "O jogo já começou nesta sala!",
        });
      }
      if (room.players.length >= 5) {
        return socket.emit("room_error", { message: "A sala está cheia!" });
      }

      const isHost = room.players.length === 0;

      const newPlayer: Player = {
        id: socket.id,
        username,
        isHost,
        cards: [],
        inGame: true,
        points: 0,
      };
      room.players.push(newPlayer);

      socket.join(roomCode);
      console.log(`${username} entrou na sala ${roomCode}. Host? ${isHost}`);

      io.to(roomCode).emit("room_update", {
        players: room.players,
        status: room.status,
      });
    },
  );

  // Evento: Iniciar o jogo (Apenas Host)
  socket.on("start_game", (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = activeRooms[roomCode];

    if (!room)
      return socket.emit("room_error", { message: "Sala não encontrada" });

    // Validação se quem pediu o start é de fato o Host daquela sala
    const playerWhoRequested = room.players.find((p) => p.id === socket.id);
    if (!playerWhoRequested || !playerWhoRequested.isHost) {
      return socket.emit("room_error", {
        message: "Apenas o Host pode iniciar o jogo!",
      });
    }

    room.status = "playing";
    room.deck = gerarBaralhoNovo();
    room.currentTurnIndex = 0; // Host começa jogando sempre

    // Distribui exatamente 1 carta inicial para cada player na sala
    room.players.forEach((player) => {
      player.cards = [];
      const cartaPuxada = puxarCartaDaSala(room);
      player.cards.push(cartaPuxada);
      checkCards(cartaPuxada, player, roomCode);
      console.log(`[Start] ${player.username} recebeu:`, cartaPuxada);
    });

    io.to(roomCode).emit("game_started", {
      message: "O jogo começou e as cartas iniciais foram distribuídas!",
      currentTurn: room.players[0]?.username,
      players: room.players.map((p) => ({
        username: p.username,
        cards: p.cards,
      })),
      cardsRemaining: room.deck.length,
    });
  });

  // Evento: Jogador solicita uma NOVA CARTA (HIT)
  socket.on("game:hit", (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = activeRooms[roomCode];

    if (!room || room.status !== "playing") return;

    // Validação de Turno: Quem chamou é o jogador da vez?
    const jogadorAtual = room.players[room.currentTurnIndex];
    if (jogadorAtual?.id !== socket.id) {
      return socket.emit("game:error", { message: "Não é o seu turno!" });
    }

    // Sorteia e insere a nova carta na mão do jogador atual
    const novaCarta = puxarCartaDaSala(room);
    jogadorAtual.cards.push(novaCarta);
    checkCards(novaCarta, jogadorAtual, roomCode);

    console.log(`${jogadorAtual.username} puxou:`, novaCarta);
    io.to(roomCode).emit("game:card_drawn", {
      username: jogadorAtual.username,
      cards: jogadorAtual.cards,
      cardsRemaining: room.deck.length,
    });
    passarProximoTurno(room, io);

    // Valida a condição de derrota ou quebra de regras do jogo
    const estourou = checarSeEstourou(jogadorAtual.cards);

    // if (estourou) {
    //   io.to(roomCode).emit("game:player_busted", {
    //     username: jogadorAtual.username,
    //     cards: jogadorAtual.cards,
    //     message: `${jogadorAtual.username} estourou ou repetiu uma carta e perdeu a vez!`
    //   });

    //   // Passa a vez automaticamente porque ele perdeu
    //   passarProximoTurno(room, io);
    // } else {
    //   // Se estiver seguro, atualiza a sala inteira com a mão nova e o mesmo jogador continua jogando
    //   io.to(roomCode).emit("game:card_drawn", {
    //     username: jogadorAtual.username,
    //     cards: jogadorAtual.cards,
    //     cardsRemaining: room.deck.length
    //   });
    // }
  });

  // Evento: Jogador escolhe PARAR / MANTER (STAND)
  socket.on("game:stand", (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = activeRooms[roomCode];

    if (!room || room.status !== "playing") return;

    // Validação de Turno: Quem chamou é o jogador da vez?
    const jogadorAtual = room.players[room.currentTurnIndex];
    if (jogadorAtual?.id !== socket.id) {
      return socket.emit("game:error", { message: "Não é o seu turno!" });
    }

    console.log(`${jogadorAtual.username} escolheu parar/manter.`);

    io.to(roomCode).emit("game:player_stood", {
      username: jogadorAtual.username,
      message: `${jogadorAtual.username} segurou seu jogo e passou a vez.`,
    });

    // Passa obrigatoriamente o controle para o próximo jogador da lista circular
    passarProximoTurno(room, io);
  });

  // Evento: Desconexão limpa
  socket.on("disconnect", () => {
    console.log(`Usuário desconectou: ${socket.id}`);
    // Futuramente você pode adicionar a lógica de remover o jogador de dentro do activeRooms aqui!
  });
});

// Inicialização do servidor na porta correta
httpServer.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
