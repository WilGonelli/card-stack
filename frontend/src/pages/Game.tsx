import { useGameActions } from "../game/useGame";
import styles from "../App.module.css";

export function Game() {
  const { state, pullCard, stand, selectTarget, leaveRoom } = useGameActions();
  const {
    room,
    logs,
    mySocketId,
    actionPending,
    flipResult,
    duplicateInfo,
    error,
  } = state;

  if (!room) return null;

  const isMyTurn = room.currentPlayer === mySocketId;
  const myPlayer = room.players.find((p) => p.id === mySocketId);
  const amPendingAction = actionPending && actionPending.pulledBy === mySocketId;
  const currentRoundPlayer = room.players.find(
    (p) => p.id === room.currentPlayer
  );

  return (
    <div className={styles.container}>
      <h1>Card Stack - Test Frontend</h1>
      {error && <p className={styles.error}>{error}</p>}

      <div className={`${styles.roomCode} ${styles.roomCodeSmall}`}>
        Sala: {room.roomCode}
      </div>

      <div className={styles.gameInfo}>
        <span>
          Rodada: <span className={styles.highlight}>{room.currentRound}</span>
        </span>
        <span>
          Status: <span className={styles.highlight}>{room.status}</span>
        </span>
      </div>

      <div
        className={`${styles.turnIndicator} ${isMyTurn ? styles.myTurn : ""}`}
      >
        {isMyTurn
          ? "SUA VEZ"
          : `Vez de: ${currentRoundPlayer?.username || "?"}`}
      </div>

      {myPlayer && (
        <div className={styles.hand}>
          <h2>
            Minha Mao ({myPlayer.cards.length} numeros +{" "}
            {myPlayer.specialCards.length} especiais) | {myPlayer.points} pts
            {myPlayer.isFrozen && " | FROZEN"}
            {!myPlayer.inGame && myPlayer.eliminatedBy
              ? ` | Eliminado: ${myPlayer.eliminatedBy}`
              : ""}
          </h2>
          <div className={styles.handCards}>
            {myPlayer.cards.map((c) => (
              <span className={styles.cardChip} key={c.id}>
                {c.value}
              </span>
            ))}
            {myPlayer.specialCards.map((c) => (
              <span
                className={`${styles.cardChip} ${styles.special}`}
                key={c.id}
              >
                {c.value}
              </span>
            ))}
            {myPlayer.cards.length === 0 &&
              myPlayer.specialCards.length === 0 && (
                <span className={styles.noCards}>Nenhuma carta</span>
              )}
          </div>
        </div>
      )}

      <div className={styles.allPlayers}>
        <h2>Jogadores ({room.players.length})</h2>
        {room.players.map((p) => (
          <div className={styles.playerHandCard} key={p.id}>
            <div className={styles.playerHandHeader}>
              <span className={styles.name}>{p.username}</span>
              <span className={styles.playerHandMeta}>
                {p.isHost && (
                  <span className={`${styles.badge} ${styles.host}`}>
                    HOST
                  </span>
                )}
                {p.id === mySocketId && (
                  <span className={`${styles.badge} ${styles.voce}`}>
                    VOCE
                  </span>
                )}
                {p.id === room.currentPlayer && (
                  <span className={`${styles.badge} ${styles.turno}`}>
                    TURNO
                  </span>
                )}
                {p.isFrozen && (
                  <span className={`${styles.badge} ${styles.frozen}`}>
                    FROZEN
                  </span>
                )}
                {!p.inGame && (
                  <span className={`${styles.badge} ${styles.eliminated}`}>
                    {p.eliminatedBy || "OUT"}
                  </span>
                )}
                <span className={styles.points}>{p.points} pts</span>
              </span>
            </div>
            <div className={styles.handCards}>
              {p.cards.map((c) => {
                const isDuplicate =
                  duplicateInfo &&
                  duplicateInfo.playerId === p.id &&
                  duplicateInfo.cardValue === c.value;
                const isSaved = isDuplicate && duplicateInfo.extraHealthUsed;
                return (
                  <span
                    className={`${styles.cardChip} ${
                      isDuplicate
                        ? isSaved
                          ? styles.duplicateSaved
                          : styles.duplicateActive
                        : ""
                    }`}
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
                    className={`${styles.cardChip} ${styles.special} ${
                      isExtraHealthUsed ? styles.extraHealthUsed : ""
                    }`}
                    key={c.id}
                  >
                    {c.value}
                  </span>
                );
              })}
              {p.cards.length === 0 && p.specialCards.length === 0 && (
                <span className={styles.noCards}>Nenhuma carta</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {flipResult && (
        <div className={styles.flipResult}>
          <h2>
            Flip Three de {flipResult.pulledByUsername} em{" "}
            {flipResult.targetUsername}
          </h2>
          <div>
            {flipResult.cards.map((r, i) => (
              <span
                className={`${styles.flipCard} ${styles[r.effect]}`}
                key={i}
              >
                {r.card.value} ({r.effect})
              </span>
            ))}
          </div>
        </div>
      )}

      {actionPending && (
        <div className={styles.actionPending}>
          <h2>{actionPending.message}</h2>
          {amPendingAction && (
            <div className={styles.targetButtons}>
              {actionPending.targets.map((t) => (
                <button key={t.id} onClick={() => selectTarget(t.id)}>
                  {t.username}
                </button>
              ))}
            </div>
          )}
          {!amPendingAction && (
            <p className={styles.waitingText}>
              Aguardando {actionPending.pulledByUsername} selecionar...
            </p>
          )}
        </div>
      )}

      {myPlayer?.inGame && (
        <div className={styles.gameActions}>
          <button
            disabled={!isMyTurn || !!actionPending}
            onClick={pullCard}
          >
            Puxar Carta
          </button>
          <button
            className={styles.secondary}
            disabled={!isMyTurn || !!actionPending}
            onClick={stand}
          >
            Parar
          </button>
        </div>
      )}
      {!myPlayer?.inGame && myPlayer?.eliminatedBy && (
        <div
          className={`${styles.eliminatedCard} ${
            styles[`eliminated-${myPlayer.eliminatedBy}`]
          }`}
        >
          <span className={styles.eliminatedIcon}>
            {myPlayer.eliminatedBy === "freeze" && "❄️"}
            {myPlayer.eliminatedBy === "duplicate" && "🚫"}
            {myPlayer.eliminatedBy === "stand" && "✋"}
          </span>
          <div className={styles.eliminatedText}>
            <strong>
              {myPlayer.eliminatedBy === "freeze" && "Congelado"}
              {myPlayer.eliminatedBy === "duplicate" &&
                "Eliminado por Duplicata"}
              {myPlayer.eliminatedBy === "stand" && "Optou por Parar"}
            </strong>
            <span>Você está fora desta rodada</span>
          </div>
        </div>
      )}

      <div className={styles.logs}>
        <h2>Log</h2>
        {logs
          .slice()
          .reverse()
          .map((l, i) => (
            <p key={i}>{l}</p>
          ))}
      </div>

      <button
        className={`${styles.danger} ${styles.fullWidth}`}
        onClick={leaveRoom}
      >
        Sair da Sala
      </button>
    </div>
  );
}
