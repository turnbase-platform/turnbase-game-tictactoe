import { canMove, statusLine, type Model } from "./model.js";

const STYLE = `
  body { font-family: system-ui, sans-serif; display: grid; place-items: center; margin: 0;
         min-height: 100vh; background: #f6f7f9; color: #1c2430; }
  main { text-align: center; }
  .board { display: grid; grid-template-columns: repeat(3, 5.5rem); gap: .4rem; margin: 1rem auto; }
  .cell { width: 5.5rem; height: 5.5rem; font-size: 2.4rem; font-weight: 700; border: 0;
          border-radius: .5rem; background: #fff; box-shadow: 0 1px 3px #0003; cursor: pointer; }
  .cell:disabled { cursor: default; }
  .cell:not(:disabled):hover { background: #e8f0fe; }
  .status { min-height: 1.5rem; }
`;

/** Draws the model into `root`, calling `onMove(cell)` for a click on a playable cell. */
export function render(root: HTMLElement, model: Model, onMove: (cell: number) => void): void {
  if (document.head.querySelector("style[data-ttt]") === null) {
    const style = document.createElement("style");
    style.dataset.ttt = "";
    style.textContent = STYLE;
    document.head.append(style);
  }
  const main = document.createElement("main");
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("role", "status");
  status.textContent = statusLine(model);
  const board = document.createElement("div");
  board.className = "board";
  model.board.forEach((mark, cell) => {
    const button = document.createElement("button");
    button.className = "cell";
    button.dataset.cell = String(cell);
    button.textContent = mark;
    button.setAttribute("aria-label", `Cell ${String(cell + 1)}${mark === "" ? "" : `, ${mark}`}`);
    button.disabled = !canMove(model, cell);
    button.addEventListener("click", () => {
      onMove(cell);
    });
    board.append(button);
  });
  main.append(status, board);
  root.replaceChildren(main);
}
