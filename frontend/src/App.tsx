import { useGameContext } from "./game/context";
import styles from "./App.module.css";
import { Lobby } from "./pages/Lobby";
import { Room } from "./pages/Room";
import { Game } from "./pages/Game";
import { RoundEnd } from "./pages/RoundEnd";
import { GameEnd } from "./pages/GameEnd";

export default function App() {
  const { state } = useGameContext();
  const { view } = state;

  if (view === "lobby") return <Lobby />;
  if (view === "room") return <Room />;
  if (view === "game_end") return <GameEnd />;
  if (view === "round_end") return <RoundEnd />;
  if (view === "game") return <Game />;

  return (
    <div className={styles.container}>
      <p>Carregando...</p>
    </div>
  );
}
