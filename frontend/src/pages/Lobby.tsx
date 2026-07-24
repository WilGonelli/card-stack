import { useGameContext } from "../game/context";
import styles from "../App.module.css";

export function Lobby() {
  const { state, dispatch, socket } = useGameContext();
  const { username, joinRoomCode, error } = state;

  const createRoom = async () => {
    if (!username.trim()) return;
    try {
      const res = await fetch(
        `http://${window.location.hostname}:3001/app/create-room`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        }
      );
      const data = await res.json();
      dispatch({ type: "SET_JOIN_ROOM_CODE", code: data.roomCode });
      socket?.emit("room:join", {
        roomId: data.roomCode,
        playerName: username,
      });
    } catch {
      dispatch({ type: "SET_ERROR", message: "Erro ao criar sala" });
      setTimeout(() => dispatch({ type: "CLEAR_ERROR" }), 3000);
    }
  };

  const joinRoom = () => {
    if (!joinRoomCode.trim() || !username.trim()) return;
    socket?.emit("room:join", {
      roomId: joinRoomCode.toUpperCase(),
      playerName: username,
    });
  };

  return (
    <div className={styles.container}>
      <h1>Card Stack - Test Frontend</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.lobby}>
        <div className={styles.lobbySection}>
          <h2>Criar Sala</h2>
          <input
            placeholder="Seu username"
            value={username}
            onChange={(e) =>
              dispatch({ type: "SET_USERNAME", username: e.target.value })
            }
          />
          <button disabled={!username.trim()} onClick={createRoom}>
            Criar e Entrar
          </button>
        </div>
        <div className={styles.lobbySection}>
          <h2>Entrar na Sala</h2>
          <input
            placeholder="Seu username"
            value={username}
            onChange={(e) =>
              dispatch({ type: "SET_USERNAME", username: e.target.value })
            }
          />
          <input
            placeholder="Código da sala"
            value={joinRoomCode}
            onChange={(e) =>
              dispatch({
                type: "SET_JOIN_ROOM_CODE",
                code: e.target.value.toUpperCase(),
              })
            }
            maxLength={5}
          />
          <button
            disabled={!username.trim() || joinRoomCode.length < 5}
            onClick={joinRoom}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
