import { TurnBaseClient } from "@turnbase/gdk";
import { apply, initialModel, type GameEvent, type Model, type Move } from "./model.js";
import { render } from "./view.js";

const client = new TurnBaseClient<Move, GameEvent>();
const root = document.body;
let model: Model = initialModel(null);

function draw(): void {
  render(root, model, (cell) => {
    client.sendAction({ cell });
  });
}

client
  .onInit((ctx) => {
    model = initialModel(ctx.self?.id ?? null);
    draw();
  })
  .onGameEvent((event) => {
    model = apply(model, event);
    draw();
  })
  .onPlayerLeft((player) => {
    model = { ...model, message: `${player.displayName} left the game.` };
    draw();
  })
  .onGameOver(() => {
    model = { ...model, over: true, message: model.message };
    draw();
  })
  .start();
