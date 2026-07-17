# Arquitetura do Backend — Card Stack (Flip Three)

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Linguagem | TypeScript | ^6.0.3 |
| Runtime | Node.js | — |
| HTTP | Express | ^5.2.1 |
| WebSocket | Socket.IO | ^4.8.3 |
| Module System | ESM (`"type": "module"`) | — |
| Compilador | TypeScript (`nodenext`) | — |

## Visão Geral da Arquitetura

O projeto segue uma arquitetura **event-driven** com separação de responsabilidades:

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE                              │
│              (Frontend / Postman / ws)                    │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
      HTTP POST    │   WebSocket      │   WebSocket
      /create-room │   (Socket.IO)    │   (Socket.IO)
                   ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                   backend/src/                           │
│                                                         │
│  ┌──────────┐     ┌──────────────────────────┐         │
│  │ index.ts │────▶│   sockets/index.ts        │         │
│  │ (entry)  │     │   ├─ roomHandler.ts       │         │
│  └────┬─────┘     │   └─ gameHandler.ts       │         │
│       │           └──────────┬───────────────┘         │
│       ▼                      ▼                          │
│  ┌──────────┐     ┌──────────────────────────┐         │
│  │ router/  │     │       core/               │         │
│  │ routes.ts│     │   ├─ CardEngine.ts        │         │
│  └────┬─────┘     │   ├─ GameEngine.ts        │         │
│       │           │   └─ roomManager.ts       │         │
│       ▼           └──────────┬───────────────┘         │
│  ┌──────────┐                ▼                          │
│  │controller│     ┌──────────────────────────┐         │
│  │GameCtrl  │     │     interfaces/           │         │
│  └──────────┘     │   ├─ Cards.ts             │         │
│                   │   ├─ Game.ts              │         │
│                   │   └─ Player.ts            │         │
│                   └──────────────────────────┘         │
│                                                         │
│                   Estado em Memória                     │
│              Record<string, GameRoom>                   │
└─────────────────────────────────────────────────────────┘
```

## Árvore de Pastas

```
backend/
├── package.json
├── package-lock.json
├── tsconfig.json
│
└── src/
    ├── index.ts                        # Entry point do servidor
    │
    ├── config/
    │   └── config.ts                   # (legado) Configurações duplicadas, não utilizado
    │
    ├── interfaces/
    │   ├── index.ts                     # Re-exports de todos os tipos
    │   ├── Cards.ts                     # Interface Card
    │   ├── Game.ts                      # Interface GameRoom
    │   └── Player.ts                   # Interface Player
    │
    ├── core/
    │   ├── CardEngine.ts                # Criação do baralho (100 cartas)
    │   ├── GameEngine.ts                # Motor do jogo: regras, pontuação, turno, ações
    │   └── roomManager.ts              # Gerenciamento de salas em memória
    │
    ├── controllers/
    │   └── GameController.ts            # Controller HTTP: POST /app/create-room
    │
    ├── router/
    │   └── routes.ts                    # Rotas Express
    │
    └── sockets/
        ├── index.ts                     # Conector: io.on("connection") → registra handlers
        ├── roomHandler.ts              # Eventos WS: room:join, room:start
        └── gameHandler.ts              # Eventos WS: game:pull, game:stand, game:player_selected
```

## Descrição dos Arquivos

### `src/index.ts` — Entry Point

Cria o servidor Express, HTTP e Socket.IO. Inicializa os handlers de WebSocket e rotas HTTP. Porta: `3001`.

### `src/interfaces/` — Definições de Tipos

| Arquivo | Interface | Descrição |
|---------|-----------|-----------|
| `Cards.ts` | `Card` | `{ id: number; value: string }` — Uma carta do baralho |
| `Game.ts` | `GameRoom` | Estado completo de uma sala de jogo |
| `Player.ts` | `Player` | Estado de um jogador dentro de uma sala |

**GameRoom** inclui campos sensíveis (`deck`, `discardPile`) que são removidos antes de enviar ao cliente via `sanitizeRoom()`.

**Player** inclui `eliminatedBy` para rastrear como o jogador saiu da rodada:
- `"freeze"` — congelado (pontos = 0)
- `"duplicate"` — tirou carta duplicada sem extra health (pontos = 0)
- `"stand"` — parou voluntariamente (pontos contabilizados)

### `src/core/CardEngine.ts` — Baralho

Cria o baralho completo com 100 cartas na inicialização:

| Carta | Quantidade | Tipo |
|-------|-----------|------|
| 0 | 1 | Numérica |
| 1 | 1 | Numérica |
| 2 | 2 | Numérica |
| 3 | 3 | Numérica |
| 4 | 4 | Numérica |
| 5 | 5 | Numérica |
| 6 | 6 | Numérica |
| 7 | 7 | Numérica |
| 8 | 8 | Numérica |
| 9 | 9 | Numérica |
| 10 | 10 | Numérica |
| 11 | 11 | Numérica |
| 12 | 12 | Numérica |
| Freeze | 4 | Ação |
| Extra Health | 2 | Especial |
| Flip Three | 3 | Ação |
| + 2 | 2 | Especial |
| + 4 | 2 | Especial |
| + 6 | 2 | Especial |
| + 8 | 2 | Especial |
| + 10 | 2 | Especial |
| X 2 | 2 | Especial |

### `src/core/GameEngine.ts` — Motor do Jogo

Responsável por toda a lógica de negócio. Funções principais:

| Função | Descrição |
|--------|-----------|
| `sanitizeRoom()` | Remove `deck` e `discardPile` antes de enviar ao cliente |
| `gerarBaralhoNovo()` | Clona o baralho global |
| `checkReshuffle()` | Verifica se deve reciclar o discard pile (≤20 cartas) |
| `puxarCartaDaSala()` | Sorteia e remove uma carta do deck da sala |
| `numberCheck()` | Verifica se uma carta é numérica |
| `cardsCheck()` | Verifica se uma carta duplicada existe no deck |
| `processNumberCard()` | Processa carta numérica (duplicata + extra health) |
| `processSpecialCard()` | Adiciona carta especial ao specialDeck |
| `processFlipThreeCards()` | Executa Flip Three: puxa 3 cartas para o alvo |
| `freezePlayer()` | Congela um jogador (elimina da rodada) |
| `standPlayer()` | Marca jogador como parou voluntariamente |
| `passarProximoTurno()` | Avança para o próximo jogador ativo |
| `checkRoundEnd()` | Verifica se a rodada deve encerrar |
| `checkUniqueCardsBonus()` | Verifica se jogador tem 7 cartas únicas |
| `sumPoints()` | Calcula pontuação (base × X2 + bonus) |
| `encerrarRodada()` | Encerra rodada, calcula pontos, inicia próxima |

### `src/core/roomManager.ts` — Gerenciador de Salas

Armazena salas em memória (`Record<string, GameRoom>`). Fornece CRUD básico:

| Método | Descrição |
|--------|-----------|
| `getRoom()` | Busca sala por código |
| `saveRoom()` | Salva/atualiza sala |
| `deleteRoom()` | Remove sala |
| `getAllRooms()` | Retorna todas as salas |
| `addPlayerToRoom()` | Adiciona jogador com validações (max 9, status waiting) |

### `src/controllers/GameController.ts` — Controller HTTP

Única rota HTTP: `POST /app/create-room` — Cria uma sala com código aleatório de 5 caracteres.

### `src/sockets/` — Handlers WebSocket

| Arquivo | Eventos |
|---------|---------|
| `index.ts` | Conexão → delega para roomHandler e gameHandler |
| `roomHandler.ts` | `room:join`, `room:start` |
| `gameHandler.ts` | `game:pull`, `game:stand`, `game:player_selected` |

## Fluxo de Dados

1. **Cliente** emite evento WebSocket → **Handler** recebe
2. **Handler** valida estado da sala via **RoomManager**
3. **Handler** chama função de negócio do **GameEngine**
4. **GameEngine** muta o estado da sala em memória
5. **Handler** emite atualização para todos os clientes da sala (via `sanitizeRoom`)
6. **sanitizeRoom** remove `deck` e `discardPile` antes do envio

## Segurança

- O `deck` e `discardPile` **nunca** são enviados ao cliente — função `sanitizeRoom()` filtra antes de emitir
- Validação de turno: apenas o jogador atual pode agir
- Validação de ação pendente: bloqueia novos pulls enquanto freeze/flip three está pendente
- Validação de alvo: apenas jogadores ativos podem ser selecionados
