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

### ws events

* room:join
o primeiro a entrar se torna o host
maximo de usuarios 8 players
se o jogo ja estiver começado, nao aceita novos usuarios
* room:start
apenas o host pode começar o jogo
precisa de pelo menos 2 players para começar
* game:pull
puxa uma carta - se a carta for numerica adiciona o valor para o usuario
               - se a carta for uma especial execulta a ação da carta (extra health armazena para o proprio jogador uma chance extra, flip three o jogador escolhe virar 3 cartas em sequencia para si ou para algum oponente caso não aja oponente as cartas sao automaticamente virado para si, freeze o usuario escolhe um oponente para zerar na rodada caso nao tenha mais oponente ele é zerado)
               - se a carta for de melhoria (+2, +4, ..., X 2) aramzena para ser contabilizado por ultimo
