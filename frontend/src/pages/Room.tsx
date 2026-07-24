import { useGameActions } from "../game/useGame";
import styles from "../App.module.css";

export function Room() {
  const { state, startGame, leaveRoom } = useGameActions();
  const { room, mySocketId, error } = state;

  if (!room) return null;

  const iAmHost = room.players.some((p) => p.id === mySocketId && p.isHost);

  return (
    <div className={styles.container}>
      <h1>Card Stack - Test Frontend</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.roomCode}>{room.roomCode}</div>
      <div className={styles.playerList}>
        <h2>Jogadores ({room.players.length})</h2>
        {room.players.map((p) => (
          <div className={styles.playerItem} key={p.id}>
            <span>
              <span className={styles.name}>{p.username}</span>
              {p.isHost && (
                <span className={`${styles.badge} ${styles.host}`}>HOST</span>
              )}
              {p.id === mySocketId && (
                <span className={`${styles.badge} ${styles.voce}`}>VOCE</span>
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
          className={styles.fullWidth}
        >
          {room.players.length < 2
            ? "Precisa de mais jogadores"
            : "Iniciar Jogo"}
        </button>
      )}
      {!iAmHost && (
        <p className={styles.centered}>Aguardando o host iniciar...</p>
      )}
      <button
        className={`${styles.danger} ${styles.fullWidth}`}
        onClick={leaveRoom}
      >
        Sair da Sala
      </button>
    </div>
  );
}
