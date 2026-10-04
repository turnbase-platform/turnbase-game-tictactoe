/** The action this game sends: the cell to mark, 0–8, row-major. Mirrors the backend's `Move`. */
export interface Move {
  cell: number;
}

/** The events the backend sends. `type` discriminates them (backend `GameMessage`). */
export type GameEvent =
  | { type: "view"; board: string[]; turn: string; over: boolean; yourMark: string }
  | { type: "move"; cell: number; mark: string; next: string }
  | { type: "rejected"; reason: string };

/** The final result, sent with the game-over effect (backend `GameMessage.Result`). */
export interface GameResult {
  type: "result";
  /** "X", "O", or "" for a draw. */
  winnerMark: string;
  /** "three in a row", "draw" or "forfeit". */
  reason: string;
}

/** What the screen shows. */
export interface Model {
  board: string[];
  turn: string | null;
  over: boolean;
  /** "X", "O", or "" for a spectator. */
  yourMark: string;
  /** The player being addressed by this client; null for a spectator. */
  selfId: string | null;
  message: string;
  /** Set once the game-over results arrive. */
  result: GameResult | null;
}

export function initialModel(selfId: string | null): Model {
  return {
    board: Array<string>(9).fill(""),
    turn: null,
    over: false,
    yourMark: "",
    selfId,
    message: "Waiting for the game…",
    result: null,
  };
}

/** Pure reducer: the first event after `init` is always a full `view`, then deltas. */
export function apply(model: Model, event: GameEvent): Model {
  switch (event.type) {
    case "view":
      return {
        ...model,
        board: [...event.board],
        turn: event.turn,
        over: event.over,
        yourMark: event.yourMark,
        message: "",
      };
    case "move": {
      const board = [...model.board];
      board[event.cell] = event.mark;
      return { ...model, board, turn: event.next, message: "" };
    }
    case "rejected":
      return { ...model, message: event.reason };
  }
}

function isResult(value: unknown): value is GameResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return r.type === "result" && typeof r.winnerMark === "string" && typeof r.reason === "string";
}

/** Pure reducer for the opaque game-over payload; one that is not a `result` only ends the game. */
export function applyResult(model: Model, results: unknown): Model {
  return { ...model, over: true, result: isResult(results) ? results : null };
}

function resultLine(model: Model, result: GameResult): string {
  if (result.winnerMark === "") return "Draw.";
  const forfeit = result.reason === "forfeit";
  if (model.yourMark === "") {
    return forfeit
      ? `${result.winnerMark} won — their opponent left.`
      : `${result.winnerMark} won.`;
  }
  if (result.winnerMark !== model.yourMark) return "You lost.";
  return forfeit ? "Your opponent left — you win." : "You won.";
}

/** True when this client may mark a cell right now. */
export function canMove(model: Model, cell: number): boolean {
  return (
    !model.over && model.selfId !== null && model.turn === model.selfId && model.board[cell] === ""
  );
}

export function statusLine(model: Model): string {
  if (model.over && model.result !== null) return resultLine(model, model.result);
  if (model.message !== "") return model.message;
  if (model.turn === null) return "Waiting for the game…";
  if (model.over) return "Game over.";
  if (model.selfId === null) return "Spectating.";
  return model.turn === model.selfId ? "Your turn." : "Opponent's turn.";
}
