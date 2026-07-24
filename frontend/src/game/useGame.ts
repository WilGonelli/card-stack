import { useCallback } from "react";
import { useGameContext } from "./context";

const WS_URL = `http://${window.location.hostname}:3001`;

export function useGameActions() {
  const { state, socket } = useGameContext();

  const createRoom = useCallback(async () => {
    if (!state.username.trim()) return;
    try {
      const res = await fetch(`${WS_URL}/app/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: state.username }),
      });
      const data = await res.json();
      joinRoom(data.roomCode);
    } catch {
      socket?.emit("_error", "Erro ao criar sala");
    }
  }, [state.username, socket]);

  const joinRoom = useCallback(
    (code?: string) => {
      const roomCode = (code || state.joinRoomCode).toUpperCase();
      if (!roomCode || !state.username.trim()) return;
      socket?.emit("room:join", { roomId: roomCode, playerName: state.username });
    },
    [state.joinRoomCode, state.username, socket]
  );

  const startGame = useCallback(() => {
    if (!state.room) return;
    socket?.emit("room:start", {
      roomId: state.room.roomCode,
      playerName: state.username,
    });
  }, [state.room, state.username, socket]);

  const pullCard = useCallback(() => {
    if (!state.room) return;
    socket?.emit("game:pull", { roomId: state.room.roomCode });
  }, [state.room, socket]);

  const stand = useCallback(() => {
    if (!state.room) return;
    socket?.emit("game:stand", { roomId: state.room.roomCode });
  }, [state.room, socket]);

  const confirmRound = useCallback(() => {
    if (!state.room) return;
    socket?.emit("room:confirm_round", { roomId: state.room.roomCode });
  }, [state.room, socket]);

  const leaveRoom = useCallback(() => {
    if (!state.room) return;
    socket?.emit("room:leave", { roomId: state.room.roomCode });
  }, [state.room, socket]);

  const selectTarget = useCallback(
    (targetId: string) => {
      if (!state.room) return;
      socket?.emit("game:player_selected", {
        roomId: state.room.roomCode,
        targetPlayerId: targetId,
      });
    },
    [state.room, socket]
  );

  return {
    state,
    socket,
    createRoom,
    joinRoom,
    startGame,
    pullCard,
    stand,
    confirmRound,
    leaveRoom,
    selectTarget,
  };
}
