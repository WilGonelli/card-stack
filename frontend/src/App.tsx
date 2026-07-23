import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";
import type {
  GameRoom,
  ActionPending,
  FlipThreeResult,
  RoundEnd,
  GameEnd,
  DuplicateInfo,
  View,
} from "./types";

const WS_URL = `http://${window.location.hostname}:3001`;

export default function App() {
  const socketRef = useRef<Socket | null>(null);

  const [view, setView] = useState<View>("lobby");
  const [username, setUsername] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [mySocketId, setMySocketId] = useState("");
  const [actionPending, setActionPending] = useState<ActionPending | null>(
    null
  );
  const [flipResult, setFlipResult] = useState<FlipThreeResult | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [roundEnd, setRoundEnd] = useState<RoundEnd | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEnd | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setMySocketId(socket.id!);
    });

    socket.on("room:updated", (data: GameRoom) => {
      setRoom(data);
      if (data.status === "playing") setView("game");
      if (data.status === "waiting") setView("room");
      if (data.status === "waiting_confirm") setView("round_end");
    });

    socket.on("game:updated", (data: GameRoom) => {
      setRoom(data);
      setActionPending(null);
      if (data.status === "playing") setView("game");
      if (data.status === "waiting_confirm") setView("round_end");
      if (data.status === "finished") setView("game_end");
    });

    socket.on("game:action_pending", (data: ActionPending) => {
      setActionPending(data);
    });

    socket.on("game:flip_three_result", (data: FlipThreeResult) => {
      setFlipResult(data);
    });

    socket.on("game:duplicate_info", (data: DuplicateInfo) => {
      setDuplicateInfo(data);
      setTimeout(() => setDuplicateInfo(null), 5000);
    });

    socket.on("game:round_end", (data: RoundEnd) => {
      setRoundEnd(data);
      setFlipResult(null);
      setDuplicateInfo(null);
      setView("round_end");
    });

    socket.on("game:game_end", (data: GameEnd) => {
      setGameEnd(data);
      setView("game_end");
    });

    socket.on("game:log", (data: { message: string }) => {
      setLogs((prev) => [...prev, data.message]);
    });

    socket.on("game:error", (msg: string) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    });

    socket.on("room:error", (msg: string) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = async () => {
    if (!username.trim()) return;
    try {
      const res = await fetch("/app/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      const code = data.roomCode;
      setJoinRoomCode(code);
      joinRoom(code);
    } catch {
      setError("Erro ao criar sala");
      setTimeout(() => setError(""), 3000);
    }
  };

  const joinRoom = (code?: string) => {
    const roomCode = code || joinRoomCode;
    if (!roomCode.trim() || !username.trim()) return;
    socketRef.current?.emit("room:join", {
      roomId: roomCode.toUpperCase(),
      playerName: username,
    });
  };

  const startGame = () => {
    if (!room) return;
    socketRef.current?.emit("room:start", {
      roomId: room.roomCode,
      playerName: username,
    });
  };

  const pullCard = () => {
    if (!room) return;
    socketRef.current?.emit("game:pull", { roomId: room.roomCode });
  };

  const stand = () => {
    if (!room) return;
    socketRef.current?.emit("game:stand", { roomId: room.roomCode });
  };

  const confirmRound = () => {
    if (!room) return;
    socketRef.current?.emit("room:confirm_round", { roomId: room.roomCode });
  };

  const leaveRoom = () => {
    if (!room) return;
    socketRef.current?.emit("room:leave", { roomId: room.roomCode });
    setView("lobby");
    setRoom(null);
    setLogs([]);
    setRoundEnd(null);
    setGameEnd(null);
    setFlipResult(null);
    setActionPending(null);
  };

  const selectTarget = (targetId: string) => {
    if (!room) return;
    socketRef.current?.emit("game:player_selected", {
      roomId: room.roomCode,
      targetPlayerId: targetId,
    });
    setActionPending(null);
  };

  const isMyTurn = room?.currentPlayer === mySocketId;
  const iAmHost = room?.players.some(
    (p) => p.id === mySocketId && p.isHost
  );
  const myPlayer = room?.players.find((p) => p.id === mySocketId);
  const amPendingAction =
    actionPending && actionPending.pulledBy === mySocketId;

  // ── Lobby ──────────────────────────────────────
  if (view === "lobby") {
    return (
      <div className="container">
        <h1>Card Stack - Test Frontend</h1>
        {error && <p style={{ color: "#e94560", textAlign: "center" }}>{error}</p>}
        <div className="lobby">
          <div className="lobby-section">
            <h2>Criar Sala</h2>
            <input
              placeholder="Seu username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button disabled={!username.trim()} onClick={createRoom}>
              Criar e Entrar
            </button>
          </div>
          <div className="lobby-section">
            <h2>Entrar na Sala</h2>
            <input
              placeholder="Seu username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              placeholder="Código da sala"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <button
              disabled={!username.trim() || joinRoomCode.length < 5}
              onClick={() => joinRoom()}
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Room (waiting) ─────────────────────────────
  if (view === "room" && room) {
    return (
      <div className="container">
        <h1>Card Stack - Test Frontend</h1>
        {error && <p style={{ color: "#e94560", textAlign: "center" }}>{error}</p>}
        <div className="room-code">{room.roomCode}</div>
        <div className="player-list">
          <h2>Jogadores ({room.players.length})</h2>
          {room.players.map((p) => (
            <div className="player-item" key={p.id}>
              <span>
                <span className="name">{p.username}</span>
                {p.isHost && <span className="badge host">HOST</span>}
                {p.id === mySocketId && (
                  <span className="badge" style={{ background: "#0a5" }}>
                    VOCE
                  </span>
                )}
              </span>
              <span>{p.points} pts</span>
            </div>
          ))}
        </div>
        {iAmHost && (
          <button
            disabled={room.players.length < 2}
            onClick={startGame}
            style={{ width: "100%", padding: "0.8rem" }}
          >
            {room.players.length < 2
              ? "Precisa de mais jogadores"
              : "Iniciar Jogo"}
          </button>
        )}
        {!iAmHost && (
          <p style={{ textAlign: "center", color: "#888" }}>
            Aguardando o host iniciar...
          </p>
        )}
        <button
          className="danger"
          onClick={leaveRoom}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          Sair da Sala
        </button>
      </div>
    );
  }

  // ── Game End ───────────────────────────────────
  if (view === "game_end" && gameEnd) {
    return (
      <div className="container">
        <h1>Fim de Jogo!</h1>
        {error && <p style={{ color: "#e94560", textAlign: "center" }}>{error}</p>}
        <p style={{ textAlign: "center", fontSize: "1.2rem", marginBottom: "1rem" }}>
          {gameEnd.message}
        </p>
        <div className="player-list">
          <h2>Resultados Finais</h2>
          <table className="results-table">
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Pontos</th>
                <th>Bonus</th>
                <th>Eliminado por</th>
              </tr>
            </thead>
            <tbody>
              {gameEnd.resultados.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.username}
                    {r.id === mySocketId && " (voce)"}
                  </td>
                  <td>{r.pontos}</td>
                  <td>{r.bonus ? "+15" : "-"}</td>
                  <td>{r.eliminatedBy || "vivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => {
            setView("lobby");
            setRoom(null);
            setLogs([]);
            setRoundEnd(null);
            setGameEnd(null);
            setFlipResult(null);
            setActionPending(null);
          }}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Voltar ao Lobby
        </button>
      </div>
    );
  }

  // ── Round End (waiting confirm) ───────────────
  if (view === "round_end") {
    const confirmedCount = room?.confirmedPlayers?.length || 0;
    const totalCount = room?.players?.length || 0;
    const iConfirmed = room?.confirmedPlayers?.includes(mySocketId) || false;

    return (
      <div className="container">
        <h1>Rodada {roundEnd?.round || "?"} Encerrada</h1>
        {error && <p style={{ color: "#e94560", textAlign: "center" }}>{error}</p>}
        <p style={{ textAlign: "center", marginBottom: "1rem" }}>
          {roundEnd?.message || "Rodada encerrada."}
        </p>
        {roundEnd && (
          <div className="player-list">
            <h2>Resultados da Rodada</h2>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Pontos</th>
                  <th>Bonus</th>
                  <th>Eliminado por</th>
                </tr>
              </thead>
              <tbody>
                {roundEnd.resultados.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.username}
                      {r.id === mySocketId && " (voce)"}
                    </td>
                    <td>{r.pontos}</td>
                    <td>{r.bonus ? "+15" : "-"}</td>
                    <td>{r.eliminatedBy || "vivo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="confirm-section">
          <p style={{ marginBottom: "0.5rem" }}>
            Confirmacoes: <strong>{confirmedCount}/{totalCount}</strong>
          </p>
          <div className="confirmed-players">
            {room?.players.map((p) => {
              const confirmed = room?.confirmedPlayers?.includes(p.id) || false;
              return (
                <span
                  key={p.id}
                  className={`confirmed-chip ${confirmed ? "confirmed" : "pending"}`}
                >
                  {p.username} {confirmed ? "✓" : "..."}
                </span>
              );
            })}
          </div>
          <button
            disabled={iConfirmed}
            onClick={confirmRound}
            style={{ width: "100%", padding: "0.8rem", marginTop: "0.75rem" }}
          >
            {iConfirmed ? "Confirmado!" : "Confirmar Proxima Rodada"}
          </button>
        </div>
      </div>
    );
  }

  // ── Game ───────────────────────────────────────
  if (view === "game" && room) {
    const currentRoundPlayer = room.players.find(
      (p) => p.id === room.currentPlayer
    );

    return (
      <div className="container">
        <h1>Card Stack - Test Frontend</h1>
        {error && <p style={{ color: "#e94560", textAlign: "center" }}>{error}</p>}

        {/* Room code */}
        <div className="room-code" style={{ fontSize: "1.2rem", padding: "0.6rem" }}>
          Sala: {room.roomCode}
        </div>

        {/* Game info */}
        <div className="game-info">
          <span>
            Rodada: <span className="highlight">{room.currentRound}</span>
          </span>
          <span>
            Status: <span className="highlight">{room.status}</span>
          </span>
        </div>

        {/* Turn indicator */}
        <div className={`turn-indicator ${isMyTurn ? "my-turn" : ""}`}>
          {isMyTurn
            ? "SUA VEZ"
            : `Vez de: ${currentRoundPlayer?.username || "?"}`}
        </div>

        {/* My hand */}
        {myPlayer && (
          <div className="hand">
            <h2>
              Minha Mao ({myPlayer.cards.length} numeros +{" "}
              {myPlayer.specialCards.length} especiais) | {myPlayer.points}{" "}
              pts
              {myPlayer.isFrozen && " | FROZEN"}
              {!myPlayer.inGame && myPlayer.eliminatedBy
                ? ` | Eliminado: ${myPlayer.eliminatedBy}`
                : ""}
            </h2>
            <div className="hand-cards">
              {myPlayer.cards.map((c) => (
                <span className="card-chip" key={c.id}>
                  {c.value}
                </span>
              ))}
              {myPlayer.specialCards.map((c) => (
                <span className="card-chip special" key={c.id}>
                  {c.value}
                </span>
              ))}
              {myPlayer.cards.length === 0 &&
                myPlayer.specialCards.length === 0 && (
                  <span style={{ color: "#666" }}>Nenhuma carta</span>
                )}
            </div>
          </div>
        )}

        {/* All players with hands */}
        <div className="all-players">
          <h2>Jogadores ({room.players.length})</h2>
          {room.players.map((p) => (
            <div className="player-hand-card" key={p.id}>
              <div className="player-hand-header">
                <span className="name">{p.username}</span>
                <span className="player-hand-meta">
                  {p.isHost && <span className="badge host">HOST</span>}
                  {p.id === mySocketId && (
                    <span className="badge" style={{ background: "#0a5" }}>
                      VOCE
                    </span>
                  )}
                  {p.id === room.currentPlayer && (
                    <span className="badge" style={{ background: "#e94560" }}>
                      TURNO
                    </span>
                  )}
                  {p.isFrozen && <span className="badge frozen">FROZEN</span>}
                  {!p.inGame && (
                    <span className="badge eliminated">
                      {p.eliminatedBy || "OUT"}
                    </span>
                  )}
                  <span style={{ marginLeft: "0.4rem" }}>{p.points} pts</span>
                </span>
              </div>
              <div className="hand-cards">
                {p.cards.map((c) => {
                  const isDuplicate =
                    duplicateInfo &&
                    duplicateInfo.playerId === p.id &&
                    duplicateInfo.cardValue === c.value;
                  const isSaved =
                    isDuplicate && duplicateInfo.extraHealthUsed;
                  return (
                    <span
                      className={`card-chip ${isDuplicate ? (isSaved ? "duplicate-saved" : "duplicate-active") : ""}`}
                      key={c.id}
                    >
                      {c.value}
                    </span>
                  );
                })}
                {p.specialCards.map((c) => {
                  const isExtraHealthUsed =
                    duplicateInfo &&
                    duplicateInfo.playerId === p.id &&
                    duplicateInfo.extraHealthUsed &&
                    c.value.toLowerCase() === "extra health";
                  return (
                    <span
                      className={`card-chip special ${isExtraHealthUsed ? "extra-health-used" : ""}`}
                      key={c.id}
                    >
                      {c.value}
                    </span>
                  );
                })}
                {p.cards.length === 0 && p.specialCards.length === 0 && (
                  <span style={{ color: "#666", fontSize: "0.85rem" }}>
                    Nenhuma carta
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Flip three result */}
        {flipResult && (
          <div className="flip-result">
            <h2>
              Flip Three de {flipResult.pulledByUsername} em{" "}
              {flipResult.targetUsername}
            </h2>
            <div>
              {flipResult.cards.map((r, i) => (
                <span className={`flip-card ${r.effect}`} key={i}>
                  {r.card.value} ({r.effect})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action pending */}
        {actionPending && (
          <div className="action-pending">
            <h2>{actionPending.message}</h2>
            {amPendingAction && (
              <div className="target-buttons">
                {actionPending.targets.map((t) => (
                  <button key={t.id} onClick={() => selectTarget(t.id)}>
                    {t.username}
                  </button>
                ))}
              </div>
            )}
            {!amPendingAction && (
              <p style={{ marginTop: "0.5rem" }}>
                Aguardando {actionPending.pulledByUsername} selecionar...
              </p>
            )}
          </div>
        )}

        {/* Game actions */}
        {myPlayer?.inGame && (
          <div className="game-actions">
            <button
              disabled={!isMyTurn || !!actionPending}
              onClick={pullCard}
            >
              Puxar Carta
            </button>
            <button
              className="secondary"
              disabled={!isMyTurn || !!actionPending}
              onClick={stand}
            >
              Parar
            </button>
          </div>
        )}
        {!myPlayer?.inGame && myPlayer?.eliminatedBy && (
          <div className={`eliminated-card eliminated-${myPlayer.eliminatedBy}`}>
            <span className="eliminated-icon">
              {myPlayer.eliminatedBy === "freeze" && "❄️"}
              {myPlayer.eliminatedBy === "duplicate" && "🚫"}
              {myPlayer.eliminatedBy === "stand" && "✋"}
            </span>
            <div className="eliminated-text">
              <strong>
                {myPlayer.eliminatedBy === "freeze" && "Congelado"}
                {myPlayer.eliminatedBy === "duplicate" && "Eliminado por Duplicata"}
                {myPlayer.eliminatedBy === "stand" && "Optou por Parar"}
              </strong>
              <span>Você está fora desta rodada</span>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="logs">
          <h2>Log</h2>
          {logs
            .slice()
            .reverse()
            .map((l, i) => (
              <p key={i}>{l}</p>
            ))}
        </div>

        <button
          className="danger"
          onClick={leaveRoom}
          style={{ width: "100%" }}
        >
          Sair da Sala
        </button>
      </div>
    );
  }

  return <div className="container"><p>Carregando...</p></div>;
}
