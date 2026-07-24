import { useGameContext } from "../game/context";
import { useGameActions } from "../game/useGame";
import styles from "../App.module.css";

export function GameEnd() {
  const { dispatch } = useGameContext();
  const { state } = useGameActions();
  const { mySocketId, gameEnd, error } = state;

  if (!gameEnd) return null;

  return (
    <div className={styles.container}>
      <h1>Fim de Jogo!</h1>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.gameEndMessage}>{gameEnd.message}</p>

      <div className={styles.playerList}>
        <h2>Resultados Finais</h2>
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
        onClick={() => dispatch({ type: "LEAVE_ROOM" })}
        className={`${styles.danger} ${styles.fullWidth}`}
      >
        Voltar ao Lobby
      </button>
    </div>
  );
}
