import { useGameActions } from "../game/useGame";
import styles from "../App.module.css";

export function RoundEnd() {
  const { state, confirmRound } = useGameActions();
  const { room, mySocketId, roundEnd, error } = state;

  if (!room || !roundEnd) return null;

  const confirmedCount = room.confirmedPlayers?.length || 0;
  const totalCount = room.players.length;
  const iConfirmed = room.confirmedPlayers?.includes(mySocketId) || false;

  return (
    <div className={styles.container}>
      <h1>Rodada {roundEnd.round} Encerrada</h1>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.centered}>{roundEnd.message}</p>

      <div className={styles.playerList}>
        <h2>Resultados da Rodada</h2>
        <table className={styles.resultsTable}>
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

      <div className={styles.confirmSection}>
        <p className={styles.confirmCount}>
          Confirmacoes
          <strong>
            : {confirmedCount}/{totalCount}
          </strong>
        </p>
        <button
          disabled={iConfirmed}
          onClick={confirmRound}
          className={`${styles.fullWidth} ${styles.mt}`}
        >
          {iConfirmed ? "Confirmado!" : "Confirmar Proxima Rodada"}
        </button>
      </div>
    </div>
  );
}
