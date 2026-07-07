// // import express from "express"
// import { startCards, CARDS_COMPLETE } from "./core/domain/Cards.js";

// startCards();
// // const app = express()

// // app.get("/",(req, res)=>{
// //  res.json({cartas:CARDS_COMPLETE})
// // })

// // app.listen(8000, ()=>{
// //   console.log("server listening port 8000")
// // })

// // const game = () => {
// //   // A função puxarCarta pode ficar fora do loop
//   const puxarCarta = () => {
//     const index = Math.floor(Math.random() * CARDS_COMPLETE.length);
//     return CARDS_COMPLETE.splice(index, 1)[0];
//   };
//   const cartaPuxada = puxarCarta();

// //   // Enquanto houver cartas no baralho, o loop continua
// //   while (CARDS_COMPLETE.length > 0) {
// //     console.log("Cartas restantes antes do sorteio:", CARDS_COMPLETE.length);

// //     console.log("Carta puxada:", cartaPuxada);

// //     console.log("-------------------");
// //   }
// // };

// // // game();

// // Interface para definir o que cada jogador tem
// interface Player {
//   id: string;
//   username: string;
//   isHost: boolean;
//   cards: any[]; // As cartas que este jogador tem na mão
// }

// interface GameRoom {
//   roomCode: string;
//   status: 'waiting' | 'playing' | 'finished';
//   players: Player[];
//   deck: any[];
//   currentTurnIndex: number; // <-- Guarda a posição (0, 1, 2...) de quem está jogando agora
// }

// // Onde todas as salas ativas ficarão guardadas na memória do Node
// const activeRooms: Record<string, GameRoom> = {};

// import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';

// const app = express();
// app.use(express.json());

// // Criamos o servidor HTTP usando o Express
// const httpServer = createServer(app);

// // Inicializamos o Socket.IO acoplado ao servidor HTTP
// const io = new Server(httpServer, {
//   cors: {
//     origin: "*", // Libera para o seu front e para o Insomnia testarem
//   }
// });

// // 1. Seu endpoint HTTP tradicional para CRIAR a sala
// app.post('/api/rooms', (req, res) => {
//   const { username } = req.body;
  
//   // Gera um código aleatório de 5 letras
//   const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  
//   // Aqui você salvaria a sala na memória ou banco
//   console.log(`Sala ${roomCode} criada por ${username}`);
  
//   res.status(201).json({ roomCode });
// });


// // 2. A conexão WebSocket
// io.on("connection", (socket) => {
//   console.log(`Usuário conectado: ${socket.id}`);

//   const passarProximoTurno = (room: GameRoom, io: any) => {
//   // Avança o índice. Se chegar no último jogador, volta para o 0 (Loop circular)
//   room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  
//   const proximoJogador = room.players[room.currentTurnIndex];

//   // Avisa a sala inteira de quem é a vez agora
//   io.to(room.roomCode).emit("game:turn_changed", {
//     currentTurn: proximoJogador.username,
//     message: `Agora é a vez de ${proximoJogador.username} jogar!`
//   });
// };

//   // Uma função simples para clonar o seu baralho completo para a sala
// const gerarBaralhoNovo = () => {
//   // Retorna uma cópia do seu array de cartas completo (CARDS_COMPLETE)
//   return [...CARDS_COMPLETE]; 
// };

// // A sua função adaptada para receber o deck específico da sala
// const puxarCartaDaSala = (room: GameRoom) => {
//   if (room.deck.length === 0) {
//     // Se o baralho acabar, opcionalmente reabastece ou trata o erro
//     room.deck = gerarBaralhoNovo(); 
//   }
//   const index = Math.floor(Math.random() * room.deck.length);
//   return room.deck.splice(index, 1)[0];
// };

// // Dentro do seu io.on("connection") ou no seu gameHandler:
// socket.on("start_game", (data: { roomCode: string }) => {
//   const { roomCode } = data;
//   const room = activeRooms[roomCode];

//   if (!room) return socket.emit("room_error", { message: "Sala não encontrada" });

//   // (Coloque aqui aquelas validações se é o Host que está iniciando...)

//   room.status = 'playing';
  
//   // 1. Inicializa o baralho exclusivo desta partida
//   room.deck = gerarBaralhoNovo();

//   room.currentTurnIndex = 0

//   // 2. Distribui uma carta para cada jogador na ordem do array
//   room.players.forEach((player) => {
//     // Inicializa a mão do jogador vazia
//     player.cards = []; 
    
//     // Puxa uma carta usando a sua lógica
//     const cartaPuxada = puxarCartaDaSala(room);
    
//     // Salva a carta no jogador dentro do estado do servidor
//     player.cards.push(cartaPuxada);
    
//     console.log(`Jogador ${player.username} recebeu a carta:`, cartaPuxada);
//   });

//   // 3. Notifica TODO MUNDO na sala com os dados iniciais
//   io.to(roomCode).emit("game_started", {
//     message: "O jogo começou e as cartas foram distribuídas!",
//     currentTurn: room.players[0]?.username, // Primeiro turno vai para o Host
//     players: room.players.map(p => ({
//       username: p.username,
//       cards: p.cards // Envia as cartas de todo mundo para todos verem (essencial no Flip 7)
//     })),
//     cardsRemaining: room.deck.length // Informação útil para exibir na tela
//   });
// });

//   socket.on("join_game_room", (data: { roomCode: string, username: string }) => {
//   const { roomCode, username } = data;

//   // 1. Se a sala não existe no nosso objeto de controle, nós criamos ela
//   if (!activeRooms[roomCode]) {
//     activeRooms[roomCode] = {
//       roomCode,
//       status: 'waiting',
//       players: [],
//       deck:[...CARDS_COMPLETE]
//     };
//   }

//   const room = activeRooms[roomCode];

//   // 2. Segurança: Não deixa entrar se o jogo já começou ou se a sala estiver cheia (ex: max 5 players)
//   if (room.status === 'playing') {
//     return socket.emit("room_error", { message: "O jogo já começou nesta sala!" });
//   }
//   if (room.players.length >= 5) {
//     return socket.emit("room_error", { message: "A sala está cheia!" });
//   }

//   // 3. O primeiro a entrar vira o HOST automaticamente
//   const isHost = room.players.length === 0;

//   // 4. Adiciona o jogador na lista da sala
//   const newPlayer: Player = {
//     id: socket.id,
//     username,
//     isHost,
//     cards:[]
//   };
//   room.players.push(newPlayer);

//   // 5. Coloca o socket na sala nativa do Socket.IO
//   socket.join(roomCode);

//   console.log(`${username} entrou na sala ${roomCode}. Host? ${isHost}`);

//   // 6. Envia para TODO MUNDO da sala a lista atualizada de jogadores
//   // O seu front-end usará isso para desenhar a lista de quem está na sala em tempo real!
//   io.to(roomCode).emit("room_update", {
//     players: room.players,
//     status: room.status
//   });
// });

// // socket.on("start_game", (data: { roomCode: string }) => {
// //   const { roomCode } = data;
// //   const room = activeRooms[roomCode];

// //   if (!room) {
// //     return socket.emit("room_error", { message: "Sala não encontrada!" });
// //   }

// //   // Busca o jogador que disparou o evento dentro da lista da sala
// //   const playerWhoRequested = room.players.find(p => p.id === socket.id);

// //   // Validação crucial: Se não for o Host, bloqueia!
// //   if (!playerWhoRequested || !playerWhoRequested.isHost) {
// //     return socket.emit("room_error", { message: "Apenas o Host pode iniciar o jogo!" });
// //   }

// //   // Validação opcional: Mínimo de jogadores para começar (ex: Flip 7 precisa de pelo menos 2)
// //   if (room.players.length < 2) {
// //     return socket.emit("room_error", { message: "Você precisa de pelo menos 2 jogadores para começar!" });
// //   }

// //   // Altera o estado da sala para jogando
// //   room.status = 'playing';

// //   console.log(`O jogo começou na sala: ${roomCode}`);

// //   // Avisa todos da sala que o jogo começou e passa o estado inicial do jogo
// //   io.to(roomCode).emit("game_started", {
// //     message: "O jogo começou!",
// //     currentTurn: room.players[0]?.username // Define que o primeiro a jogar é o primeiro que entrou (Host)
// //     // Aqui você também enviaria as primeiras cartas do deck do Flip 7, etc.
// //   });
// // });

//   // // Ouvinte: Quando o jogador pede para entrar na sala do jogo
//   // socket.on("join_game_room", (data: { roomCode: string, username: string }) => {
//   //   const { roomCode, username } = data;

//   //   // O Socket.IO tem um método nativo para colocar conexões em grupos (salas)
//   //   socket.join(roomCode);
//   //   console.log(`${username} entrou na sala: ${roomCode}`);

//   //   // Avisa TODO MUNDO que está dentro dessa sala específica que alguém entrou
//   //   io.to(roomCode).emit("room_notification", {
//   //     message: `${username} entrou no jogo!`
//   //   });
//   // });

  

//   // Ouvinte: Quando o jogador desconecta (fecha a aba, por exemplo)
//   socket.on("disconnect", () => {
//     console.log(`Usuário desconectou: ${socket.id}`);
//   });
// });

// // ATENÇÃO: Você liga o httpServer, não o app.listen!
// httpServer.listen(3000, () => {
//   console.log("Servidor rodando na porta 3000");
// });