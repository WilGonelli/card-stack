import express from "express";
import { createServer } from "http"; // 1. Importa o criador de servidor nativo
import { Server } from "socket.io"; // 2. Importa o servidor do Socket.io
import { initSocketHandlers } from "./sockets/index.js"; // Ajuste o caminho se necessário
import router from "./router/routes.js";

// Instancia o Express
const app = express();
app.use(express.json());

// 3. Cria o servidor HTTP envelopando o Express
const httpServer = createServer(app);

// 4. Instancia o Socket.io atrelado ao servidor HTTP
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Em produção, mude para a URL do seu front-end (ex: "http://localhost:5173")
    methods: ["GET", "POST"],
  },
});

// 5. Inicializa os seus handlers de Socket passando a instância do 'io'
initSocketHandlers(io);

// Suas rotas e middlewares do Express
app.get("/health", (req, res) => res.send("Server is running"));
app.use(router);

// 6. ATENÇÃO: Você deve dar o .listen no 'httpServer', e NÃO no 'app'
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando perfeitamente na porta ${PORT} 🚀`);
});

// Limpeza de conexões no reinício do nodemon/ts-node-dev (evita travar o Insomnia)
process.on("SIGINT", () => {
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});
