import { useEffect, useRef, useReducer, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { GameContext } from "./context";
import { gameReducer, initialState } from "./state";

const WS_URL = `http://${window.location.hostname}:3001`;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      dispatch({ type: "SET_SOCKET_ID", id: socket.id! });
    });

    socket.on("room:updated", (data) => {
      dispatch({ type: "ROOM_UPDATED", room: data });
    });

    socket.on("game:updated", (data) => {
      dispatch({ type: "GAME_UPDATED", room: data });
    });

    socket.on("game:action_pending", (data) => {
      dispatch({ type: "ACTION_PENDING", data });
    });

    socket.on("game:flip_three_result", (data) => {
      dispatch({ type: "FLIP_THREE_RESULT", data });
    });

    socket.on("game:duplicate_info", (data) => {
      dispatch({ type: "DUPLICATE_INFO", data });
      setTimeout(() => dispatch({ type: "CLEAR_DUPLICATE_INFO" }), 5000);
    });

    socket.on("game:round_end", (data) => {
      dispatch({ type: "ROUND_END", data });
    });

    socket.on("game:game_end", (data) => {
      dispatch({ type: "GAME_END", data });
    });

    socket.on("game:log", (data: { message: string }) => {
      dispatch({ type: "ADD_LOG", message: data.message });
    });

    socket.on("game:error", (msg: string) => {
      dispatch({ type: "SET_ERROR", message: msg });
      setTimeout(() => dispatch({ type: "CLEAR_ERROR" }), 3000);
    });

    socket.on("room:error", (msg: string) => {
      dispatch({ type: "SET_ERROR", message: msg });
      setTimeout(() => dispatch({ type: "CLEAR_ERROR" }), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <GameContext.Provider value={{ state, socket: socketRef.current, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}
