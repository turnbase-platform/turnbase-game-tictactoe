import { describe, expect, it, vi } from "vitest";
import { apply, initialModel } from "../../main/ts/model.js";
import { render } from "../../main/ts/view.js";

describe("render", () => {
  it("draws nine cells and reports a click on a playable one", () => {
    const root = document.createElement("div");
    const model = apply(initialModel("a"), {
      type: "view",
      board: ["", "", "", "", "X", "", "", "", ""],
      turn: "a",
      over: false,
      yourMark: "O",
    });
    const onMove = vi.fn();
    render(root, model, onMove);

    const cells = root.querySelectorAll<HTMLButtonElement>("button.cell");
    expect(cells).toHaveLength(9);
    expect(cells[4].disabled).toBe(true);
    expect(cells[4].textContent).toBe("X");
    cells[0].click();
    expect(onMove).toHaveBeenCalledWith(0);
  });

  it("disables the board for a spectator and injects its style once", () => {
    const root = document.createElement("div");
    const model = initialModel(null);
    render(root, model, vi.fn());
    render(root, model, vi.fn());
    expect(root.querySelectorAll("button.cell:not(:disabled)")).toHaveLength(0);
    expect(document.head.querySelectorAll("style[data-ttt]")).toHaveLength(1);
  });
});
