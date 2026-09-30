import { describe, expect, it } from "vitest";
import { apply, canMove, initialModel, statusLine } from "../../main/ts/model.js";

const view = (turn: string, board = Array<string>(9).fill("")) =>
  ({ type: "view", board, turn, over: false, yourMark: "X" }) as const;

describe("model", () => {
  it("starts with an empty board and nobody's turn", () => {
    const m = initialModel("a");
    expect(m.board).toEqual(Array<string>(9).fill(""));
    expect(statusLine(m)).toBe("Waiting for the game…");
  });

  it("takes the full picture from the first view, then applies deltas", () => {
    let m = apply(initialModel("a"), view("a"));
    expect(statusLine(m)).toBe("Your turn.");
    m = apply(m, { type: "move", cell: 4, mark: "X", next: "b" });
    expect(m.board[4]).toBe("X");
    expect(statusLine(m)).toBe("Opponent's turn.");
  });

  it("lets only the player whose turn it is mark an empty cell", () => {
    const mine = apply(initialModel("a"), view("a", ["", "", "", "", "X", "", "", "", ""]));
    expect(canMove(mine, 0)).toBe(true);
    expect(canMove(mine, 4)).toBe(false);
    const theirs = apply(initialModel("a"), view("b"));
    expect(canMove(theirs, 0)).toBe(false);
  });

  it("never lets a spectator move", () => {
    const m = apply(initialModel(null), view("a"));
    expect(canMove(m, 0)).toBe(false);
    expect(statusLine(m)).toBe("Spectating.");
  });

  it("shows a refusal and keeps the board", () => {
    const m = apply(apply(initialModel("a"), view("a")), {
      type: "rejected",
      reason: "It is not your turn.",
    });
    expect(statusLine(m)).toBe("It is not your turn.");
    expect(m.board).toEqual(Array<string>(9).fill(""));
  });

  it("blocks every cell once the game is over", () => {
    const m = { ...apply(initialModel("a"), view("a")), over: true };
    expect(canMove(m, 0)).toBe(false);
    expect(statusLine({ ...m, message: "" })).toBe("Game over.");
  });
});
