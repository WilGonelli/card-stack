# card-stack

src/
├── config/             # Configurações iniciais (servidor HTTP, CORS, instâncias do IO)
├── interfaces/         # Tipos e Interfaces do TypeScript (User, Card, Room)
├── core/               # O "coração" do jogo (regras puras, sem saber o que é web ou socket)
│   ├── cardEngine.ts   # Verificação de cards, sorteios
│   └── scoreEngine.ts  # Cálculo de pontuação
├── controllers/        # Controladores HTTP (para as rotas normais)
├── sockets/            # Toda a lógica do WebSocket
│   ├── roomHandler.ts  # Eventos de entrar/sair da sala, iniciar jogo
│   └── gameHandler.ts  # Eventos de jogadas, chat, etc.
│   └── index.ts        # Gerenciador principal (io.on("connection", ...))
└── index.ts            # Ponto de entrada (inicializa os servidores e conecta as peças)