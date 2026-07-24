import type { GameRoom, ActionPending, FlipThreeResult, RoundEnd, GameEnd, DuplicateInfo, View } from "../types";

export interface GameState {
  view: View;
  username: string;
  joinRoomCode: string;
  mySocketId: string;
  room: GameRoom | null;
  logs: string[];
  actionPending: ActionPending | null;
  flipResult: FlipThreeResult | null;
  duplicateInfo: DuplicateInfo | null;
  roundEnd: RoundEnd | null;
  gameEnd: GameEnd | null;
  error: string;
}

export type GameAction =
  | { type: "SET_VIEW"; view: View }
  | { type: "SET_USERNAME"; username: string }
  | { type: "SET_JOIN_ROOM_CODE"; code: string }
  | { type: "SET_SOCKET_ID"; id: string }
  | { type: "ROOM_UPDATED"; room: GameRoom }
  | { type: "GAME_UPDATED"; room: GameRoom }
  | { type: "ACTION_PENDING"; data: ActionPending }
  | { type: "FLIP_THREE_RESULT"; data: FlipThreeResult }
  | { type: "DUPLICATE_INFO"; data: DuplicateInfo }
  | { type: "ROUND_END"; data: RoundEnd }
  | { type: "GAME_END"; data: GameEnd }
  | { type: "ADD_LOG"; message: string }
  | { type: "SET_ERROR"; message: string }
  | { type: "CLEAR_ERROR" }
  | { type: "CLEAR_DUPLICATE_INFO" }
  | { type: "LEAVE_ROOM" }
  | { type: "RESET" };

export const initialState: GameState = {
  view: "lobby",
  username: "",
  joinRoomCode: "",
  mySocketId: "",
  room: null,
  logs: [],
  actionPending: null,
  flipResult: null,
  duplicateInfo: null,
  roundEnd: null,
  gameEnd: null,
  error: "",
};

function viewFromStatus(status: GameRoom["status"]): View {
  switch (status) {
    case "waiting": return "room";
    case "playing": return "game";
    case "waiting_confirm": return "round_end";
    case "finished": return "game_end";
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };

    case "SET_USERNAME":
      return { ...state, username: action.username };

    case "SET_JOIN_ROOM_CODE":
      return { ...state, joinRoomCode: action.code };

    case "SET_SOCKET_ID":
      return { ...state, mySocketId: action.id };

    case "ROOM_UPDATED":
      return {
        ...state,
        room: action.room,
        view: viewFromStatus(action.room.status),
      };

    case "GAME_UPDATED":
      return {
        ...state,
        room: action.room,
        actionPending: null,
        view: viewFromStatus(action.room.status),
      };

    case "ACTION_PENDING":
      return { ...state, actionPending: action.data };

    case "FLIP_THREE_RESULT":
      return { ...state, flipResult: action.data };

    case "DUPLICATE_INFO":
      return { ...state, duplicateInfo: action.data };

    case "ROUND_END":
      return {
        ...state,
        roundEnd: action.data,
        flipResult: null,
        duplicateInfo: null,
        view: "round_end",
      };

    case "GAME_END":
      return {
        ...state,
        gameEnd: action.data,
        view: "game_end",
      };

    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.message] };

    case "SET_ERROR":
      return { ...state, error: action.message };

    case "CLEAR_ERROR":
      return { ...state, error: "" };

    case "CLEAR_DUPLICATE_INFO":
      return { ...state, duplicateInfo: null };

    case "LEAVE_ROOM":
      return {
        ...state,
        view: "lobby",
        room: null,
        logs: [],
        roundEnd: null,
        gameEnd: null,
        flipResult: null,
        actionPending: null,
        duplicateInfo: null,
      };

    case "RESET":
      return { ...initialState, mySocketId: state.mySocketId };

    default:
      return state;
  }
}
