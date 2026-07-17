# Fluxo de Eventos — Card Stack (Flip Three)

## Visão Geral

O jogo utiliza **HTTP** para criação de salas e **WebSocket (Socket.IO)** para toda a comunicação durante o jogo.

```
Cliente                          Servidor
  │                                │
  │── POST /app/create-room ──────▶│  Cria sala, retorna { roomCode }
  │                                │
  │── WS: room:join ──────────────▶│  Entra na sala
  │◀── WS: room:updated ──────────│  Estado da sala (sanitizado)
  │                                │
  │── WS: room:start ─────────────▶│  Host inicia jogo
  │◀── WS: room:updated ──────────│  Status → "playing"
  │                                │
  │── WS: game:pull ──────────────▶│  Puxa carta
  │◀── WS: game:updated ──────────│  Estado atualizado
  │◀── WS: game:log ──────────────│  Log da ação
  │                                │
  │── WS: game:stand ─────────────▶│  Para de puxar
  │◀── WS: game:updated ──────────│  Estado atualizado
  │                                │
  │── WS: game:player_selected ───▶│  Seleciona alvo (freeze/flip three)
  │◀── WS: game:updated ──────────│  Estado atualizado
```

---

## Eventos HTTP

### `POST /app/create-room`

Cria uma nova sala de jogo.

**Request:**
```json
{
  "username": "string"
}
```

**Response (201):**
```json
{
  "roomCode": "ABC12"
}
```

### `GET /health`

Health check. Retorna `"Server is running"`.

---

## Eventos WebSocket — Sala

### `room:join` — Entrar na Sala

**Client envia:**
```json
{
  "roomId": "string",
  "playerName": "string"
}
```

**Server retorna (`room:updated`):**
```json
{
  "roomCode": "ABC12",
  "status": "waiting",
  "players": [
    {
      "id": "socket_id",
      "username": "Player1",
      "isHost": true,
      "points": 0,
      "inGame": false,
      "cards": [],
      "specialCards": [],
      "isFrozen": false,
      "eliminatedBy": null
    }
  ],
  "currentTurnIndex": 0,
  "currentRound": 0,
  "actionPendingFrom": null,
  "pendingActionType": null,
  "flipThreeTargetId": null,
  "flipThreeCount": 0,
  "currentPlayer": null
}
```

**Regras:**
- Sala deve existir e estar em status `"waiting"`
- Máximo 9 jogadores
- Primeiro jogador vira host automaticamente

**Erros (`game:error`):**
- `"Sala não encontrada"`
- `"O jogo já começou nesta sala"`
- `"A sala está cheia"`

---

### `room:start` — Iniciar Jogo

Apenas o host pode iniciar. Mínimo 2 jogadores.

**Client envia:**
```json
{
  "roomId": "string",
  "playerName": "string"
}
```

**Server retorna (`room:updated`):**
- `status` muda para `"playing"`
- `currentPlayer` = socket.id do host
- `currentRound` = 1
- Todos os jogadores ficam `inGame: true`

**Erros (`room:error`):**
- `"Players insuficiente para inicio."`
- `"Somente o host pode iniciar o game."`

---

## Eventos WebSocket — Jogo

### `game:pull` — Puxar Carta

Evento principal do jogo. O jogador atual puxa uma carta do baralho.

**Client envia:**
```json
{
  "roomId": "string"
}
```

**Validações:**
- Sala deve existir e estar em status `"playing"`
- Deve ser o turno do jogador (`currentPlayer === socket.id`)
- Não pode haver ação pendente (`actionPendingFrom` deve ser `undefined`)

**Fluxo interno:**
```
game:pull recebido
    │
    ├─ Carta é FREEZE?
    │   ├─ Existem outros jogadores ativos?
    │   │   ├─ SIM → Emite game:action_pending (aguarda seleção de alvo)
    │   │   └─ NÃO → Auto-freeze, avança turno
    │   └─ Rodada acabou? → encerrarRodada()
    │
    ├─ Carta é FLIP THREE?
    │   ├─ Existem outros jogadores ativos?
    │   │   ├─ SIM → Emite game:action_pending (aguarda seleção de alvo)
    │   │   └─ NÃO → Executa flip three em si mesmo
    │   └─ Rodada acabou? → encerrarRodada()
    │
    ├─ Carta é NUMÉRICA?
    │   ├─ Já tem essa carta?
    │   │   ├─ Tem extra health? → Consome extra health, descarta duplicata
    │   │   └─ Não tem → eliminatedBy: "duplicate", pontos = 0
    │   ├─ Tem 7 cartas únicas? → Bônus 15pts, encerrarRodada()
    │   └─ Senão → Adiciona carta, avança turno
    │
    └─ Carta é ESPECIAL (+2, +4, +6, +8, +10, X2, Extra Health)?
        └─ Adiciona ao specialCards, avança turno
```

**Retornos possíveis:**

#### Carta numérica (normal)
```json
// game:updated (GameRoom sanitizado)
// game:log
{ "message": "Player1 puxou 5." }
```

#### Carta numérica (duplicata sem extra health)
```json
// game:log
{ "message": "Player1 tirou 5 duplicada e foi eliminado!" }
// game:updated
```

#### Carta numérica (7 cartas únicas — bônus)
```json
// game:log
{ "message": "Player1 atingiu 7 cartas numéricas únicas! Rodada encerrada com bônus!" }
// game:round_end (resultados de todos)
// game:updated (nova rodada)
```

#### Carta Freeze (com alvos disponíveis)
```json
// game:action_pending
{
  "action": "freeze",
  "pulledBy": "socket_id",
  "pulledByUsername": "Player1",
  "targets": [
    { "id": "socket_id_2", "username": "Player2" }
  ],
  "message": "Player1 puxou Freeze! Selecione um alvo."
}
```

#### Carta Freeze (sem alvos — auto-freeze)
```json
// game:log
{ "message": "Player1 não tinha alvos e se congelou!" }
// game:updated
```

#### Carta Flip Three (com alvos disponíveis)
```json
// game:action_pending
{
  "action": "flip_three",
  "pulledBy": "socket_id",
  "pulledByUsername": "Player1",
  "targets": [
    { "id": "socket_id_2", "username": "Player2" }
  ],
  "message": "Player1 puxou Flip Three! Selecione um alvo para virar 3 cartas."
}
```

#### Carta Flip Three (sem alvos — auto-aplica)
```json
// game:flip_three_result
{
  "targetUsername": "Player1",
  "targetId": "socket_id",
  "cards": [
    { "card": { "id": 5, "value": "3" }, "effect": "added" },
    { "card": { "id": 42, "value": "+ 4" }, "effect": "stored" },
    { "card": { "id": 88, "value": "7" }, "effect": "added" }
  ]
}
// game:updated
```

#### Carta Especial (+2, X2, Extra Health, etc.)
```json
// game:log
{ "message": "Player1 puxou X 2." }
// game:updated
```

**Erros (`game:error`):**
- `"Sala não encontrada."`
- `"Jogo não iniciado."`
- `"Não é sua vez."`
- `"Aguardando ação de {playerId}."`
- `"Baralho vazio."`
- `"Jogador não encontrado."`

---

### `game:stand` — Parar de Puxar

O jogador decide parar voluntariamente. Mantém seus pontos mas sai da rodada.

**Client envia:**
```json
{
  "roomId": "string"
}
```

**Validações:**
- Deve ser o turno do jogador
- Não pode haver ação pendente

**Retorno:**
```json
// game:log
{ "message": "Player1 parou de puxar cartas." }
// game:updated (eliminatedBy: "stand")
```

**Nota:** Se o jogador parou voluntariamente, seus pontos são contabilizados normalmente no fim da rodada (diferente de freeze/duplicate que dão 0 pontos).

**Erros (`game:error`):**
- `"Resolva a ação pendente antes de parar."`

---

### `game:player_selected` — Selecionar Alvo

Usado para resolver ações pendentes (Freeze ou Flip Three).

**Client envia:**
```json
{
  "roomId": "string",
  "targetPlayerId": "string"
}
```

**Validações:**
- Quem envia deve ser o `actionPendingFrom`
- Alvo deve existir e estar `inGame: true`

#### Resolução — Freeze
```json
// game:log
{ "message": "Player1 congelou Player2!" }
// game:updated (Player2 com isFrozen: true, inGame: false, eliminatedBy: "freeze")
```

#### Resolução — Flip Three
```json
// game:flip_three_result
{
  "targetUsername": "Player2",
  "targetId": "socket_id_2",
  "pulledByUsername": "Player1",
  "cards": [
    { "card": { "id": 10, "value": "8" }, "effect": "added" },
    { "card": { "id": 55, "value": "freeze" }, "effect": "freeze" }
  ]
}
// game:log (se eliminado)
{ "message": "Player2 foi eliminado durante o Flip Three de Player1!" }
// game:updated
```

**Efeitos possíveis durante Flip Three:**

| effect | Significado |
|--------|-------------|
| `"added"` | Carta numérica adicionada ao deck do alvo |
| `"stored"` | Carta especial armazenada no specialCards |
| `"busted"` | Alvo tirou duplicada e foi eliminado |
| `"freeze"` | Alvo recebeu freeze e foi eliminado |

**Erros (`game:error`):**
- `"Não é a sua vez de selecionar um jogador."`
- `"Jogador selecionado inválido ou fora de jogo."`

---

## Eventos Recebidos pelo Cliente

### `game:updated` — Estado da Sala Atualizado

Enviado após cada ação que muda o estado. Contém o `GameRoom` **sanitizado** (sem `deck` e `discardPile`).

```json
{
  "roomCode": "ABC12",
  "status": "playing",
  "players": [
    {
      "id": "socket_id",
      "username": "Player1",
      "isHost": true,
      "points": 45,
      "inGame": true,
      "cards": [
        { "id": 10, "value": "5" },
        { "id": 25, "value": "8" }
      ],
      "specialCards": [
        { "id": 80, "value": "+ 4" },
        { "id": 90, "value": "X 2" }
      ],
      "isFrozen": false,
      "eliminatedBy": null
    }
  ],
  "currentTurnIndex": 1,
  "currentRound": 3,
  "actionPendingFrom": null,
  "pendingActionType": null,
  "flipThreeTargetId": null,
  "flipThreeCount": 0,
  "currentPlayer": "socket_id_2"
}
```

**Campos NÃO incluídos (omitidos por segurança):**
- `deck` — cartas restantes no baralho
- `discardPile` — cartas descartadas

---

### `game:action_pending` — Ação Pendente

Enviado quando o jogador precisa escolher um alvo (Freeze ou Flip Three).

```json
{
  "action": "freeze",
  "pulledBy": "socket_id",
  "pulledByUsername": "Player1",
  "targets": [
    { "id": "socket_id_2", "username": "Player2" },
    { "id": "socket_id_3", "username": "Player3" }
  ],
  "message": "Player1 puxou Freeze! Selecione um alvo."
}
```

---

### `game:flip_three_result` — Resultado do Flip Three

Enviado quando as 3 cartas do Flip Three são processadas.

```json
{
  "targetUsername": "Player2",
  "targetId": "socket_id_2",
  "pulledByUsername": "Player1",
  "cards": [
    { "card": { "id": 5, "value": "3" }, "effect": "added" },
    { "card": { "id": 42, "value": "+ 4" }, "effect": "stored" },
    { "card": { "id": 88, "value": "7" }, "effect": "added" }
  ]
}
```

---

### `game:round_end` — Fim de Rodada

Enviado quando a rodada termina. Inclui resultados de todos os jogadores.

```json
{
  "round": 3,
  "resultados": [
    {
      "id": "socket_id",
      "username": "Player1",
      "pontos": 32,
      "bonus": false,
      "eliminatedBy": "stand"
    },
    {
      "id": "socket_id_2",
      "username": "Player2",
      "pontos": 0,
      "bonus": false,
      "eliminatedBy": "freeze"
    },
    {
      "id": "socket_id_3",
      "username": "Player3",
      "pontos": 57,
      "bonus": true,
      "eliminatedBy": null
    }
  ],
  "message": "Rodada 3 encerrada."
}
```

**Regras de pontuação:**
- `eliminatedBy: "freeze"` → pontos = 0
- `eliminatedBy: "duplicate"` → pontos = 0
- `eliminatedBy: "stand"` ou `null` → pontos calculados normalmente
- `bonus: true` → jogador tinha 7 cartas numéricas únicas (+15 pontos)

---

### `game:game_end` — Fim de Jogo

Enviado quando um jogador atinge 200+ pontos.

```json
{
  "winner": {
    "id": "socket_id",
    "username": "Player1",
    "points": 210
  },
  "resultados": [
    { "id": "socket_id", "username": "Player1", "pontos": 55, "bonus": false, "eliminatedBy": null }
  ],
  "message": "Player1 venceu com 210 pontos!"
}
```

**Após `game:game_end`, a sala é deletada do servidor.**

---

### `game:log` — Log de Ação

Mensagem de texto descrevendo o que aconteceu.

```json
{
  "message": "Player1 puxou X 2."
}
```

---

### `game:error` — Erro

Enviado apenas para o jogador que causou o erro (não para a sala inteira).

```json
"Não é sua vez."
```

---

## Resumo dos Eventos

### Client → Server

| Evento | Dados | Descrição |
|--------|-------|-----------|
| `room:join` | `{ roomId, playerName }` | Entrar na sala |
| `room:start` | `{ roomId, playerName }` | Iniciar jogo (host) |
| `game:pull` | `{ roomId }` | Puxar carta |
| `game:stand` | `{ roomId }` | Parar de puxar |
| `game:player_selected` | `{ roomId, targetPlayerId }` | Selecionar alvo |

### Server → Client

| Evento | Dados | Escopo |
|--------|-------|--------|
| `room:updated` | `GameRoom` sanitizado | Sala inteira |
| `game:updated` | `GameRoom` sanitizado | Sala inteira |
| `game:action_pending` | `{ action, pulledBy, targets[], ... }` | Sala inteira |
| `game:flip_three_result` | `{ targetUsername, cards[] }` | Sala inteira |
| `game:round_end` | `{ round, resultados[], message }` | Sala inteira |
| `game:game_end` | `{ winner, resultados[], message }` | Sala inteira |
| `game:log` | `{ message }` | Sala inteira |
| `game:error` | `string` | Apenas o jogador |
| `room:error` | `string` | Apenas o jogador |
