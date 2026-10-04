import { describe, expect, it } from "vitest";
import { apply, applyResult, canMove, initialModel, statusLine } from "../../main/ts/model.js";

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

  describe("results", () => {
    const result = (winnerMark: string, reason: string) => ({ type: "result", winnerMark, reason });
    const as = (yourMark: string, r: unknown) =>
      statusLine(
        applyResult({ ...apply(initialModel("a"), view("a")), yourMark, message: "stale" }, r),
      );

    it("tells the winner and the loser", () => {
      expect(as("X", result("X", "three in a row"))).toBe("You won.");
      expect(as("O", result("X", "three in a row"))).toBe("You lost.");
    });

    it("announces a draw to everyone", () => {
      expect(as("X", result("", "draw"))).toBe("Draw.");
      expect(as("", result("", "draw"))).toBe("Draw.");
    });

    it("names the winning mark to a spectator", () => {
      expect(as("", result("X", "three in a row"))).toBe("X won.");
      expect(as("", result("O", "three in a row"))).toBe("O won.");
      expect(as("", result("O", "forfeit"))).toBe("O won — their opponent left.");
    });

    it("gives the winner the forfeit reason", () => {
      expect(as("O", result("O", "forfeit"))).toBe("Your opponent left — you win.");
    });

    it("leaves the status alone for a payload that is not a result", () => {
      expect(as("X", { nope: 1 })).toBe("stale");
      expect(as("X", null)).toBe("stale");
    });

    it("ends the game", () => {
      expect(applyResult(initialModel("a"), result("X", "draw")).over).toBe(true);
    });
  });
});
