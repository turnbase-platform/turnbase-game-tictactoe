package io.turnbase.games.tictactoe;

import io.turnbase.gdk.TurnBaseGame;
import io.turnbase.gdk.context.ActionContext;
import io.turnbase.gdk.context.InitContext;
import io.turnbase.gdk.context.PlayerLeftContext;
import io.turnbase.gdk.context.ResyncContext;
import io.turnbase.gdk.effect.Effect;
import io.turnbase.gdk.effect.Effects;
import io.turnbase.gdk.model.GameOutcome;
import io.turnbase.gdk.model.Player;
import io.turnbase.gdk.model.Team;
import io.turnbase.gdk.result.ActionResult;
import io.turnbase.gdk.result.InitResult;
import io.turnbase.gdk.result.PlayerLeftResult;
import io.turnbase.gdk.result.ViewResult;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Tic-tac-toe for two players, one per team (the manifest's two single-seat team templates). The
 * first team plays X and moves first.
 *
 * <p>Nothing here is hidden information, so every viewer gets the same view; the only per-viewer
 * field is {@code yourMark}.
 */
public final class TicTacToeGame implements TurnBaseGame<TicTacToeState> {

  private static final int[][] LINES = {
    {0, 1, 2}, {3, 4, 5}, {6, 7, 8}, {0, 3, 6}, {1, 4, 7}, {2, 5, 8}, {0, 4, 8}, {2, 4, 6}
  };

  @Override
  public InitResult<TicTacToeState> onInit(InitContext ctx) {
    List<Team> teams = ctx.teams();
    Team first = teams.get(0);
    Team second = teams.get(1);
    Player x = first.players().get(0);
    Player o = second.players().get(0);
    var state =
        new TicTacToeState(
            new ArrayList<>(Collections.nCopies(9, TicTacToeState.EMPTY)),
            x.id(),
            first.id(),
            o.id(),
            second.id(),
            x.id(),
            false);
    return InitResult.from(state)
        .effect(
            Effects.log("**" + x.displayName() + "** plays X, **" + o.displayName() + "** plays O"))
        .build();
  }

  @Override
  public ActionResult<TicTacToeState> onAction(TicTacToeState s, ActionContext ctx) {
    UUID mover = ctx.player().id();
    int cell = ctx.action(Move.class).cell();
    if (s.over()) {
      return rejected(s, mover, "The game is over.");
    }
    if (!mover.equals(s.turn())) {
      return rejected(s, mover, "It is not your turn.");
    }
    if (cell < 0 || cell > 8 || !TicTacToeState.EMPTY.equals(s.board().get(cell))) {
      return rejected(s, mover, "That cell is not available.");
    }

    String mark = s.markOf(mover);
    List<String> board = new ArrayList<>(s.board());
    board.set(cell, mark);

    boolean won = wins(board, mark);
    boolean full = !board.contains(TicTacToeState.EMPTY);
    boolean over = won || full;
    UUID next = over ? mover : s.other(mover);
    var nextState =
        new TicTacToeState(board, s.xPlayer(), s.xTeam(), s.oPlayer(), s.oTeam(), next, over);

    List<Effect> effects = new ArrayList<>();
    effects.add(
        Effects.log(
            "**"
                + ctx.player().displayName()
                + "** marked cell "
                + (cell + 1)
                + " ("
                + mark
                + ")"));
    effects.add(Effects.broadcast(GameMessage.MovePlayed.of(cell, mark, next)));
    if (won) {
      effects.add(
          Effects.gameOver(
              outcome(nextState, mover), GameMessage.Result.of(mark, "three in a row")));
    } else if (full) {
      effects.add(Effects.gameOver(outcome(nextState, null), GameMessage.Result.of("", "draw")));
    }
    return ActionResult.from(nextState).effects(effects).build();
  }

  @Override
  public PlayerLeftResult<TicTacToeState> onPlayerLeft(TicTacToeState s, PlayerLeftContext ctx) {
    UUID leaver = ctx.player().id();
    if (s.over()) {
      return PlayerLeftResult.of(s);
    }
    UUID winner = s.other(leaver);
    var nextState =
        new TicTacToeState(s.board(), s.xPlayer(), s.xTeam(), s.oPlayer(), s.oTeam(), winner, true);
    return PlayerLeftResult.from(nextState)
        .effect(Effects.log("**" + ctx.player().displayName() + "** left — the opponent wins"))
        .effect(
            Effects.gameOver(
                outcome(nextState, winner), GameMessage.Result.of(s.markOf(winner), "forfeit")))
        .build();
  }

  @Override
  public ViewResult onResync(TicTacToeState s, ResyncContext ctx) {
    String yourMark = ctx.viewer().map(p -> s.markOf(p.id())).orElse("");
    return ViewResult.of(GameMessage.View.of(s, yourMark));
  }

  private static ActionResult<TicTacToeState> rejected(
      TicTacToeState s, UUID mover, String reason) {
    return ActionResult.from(s)
        .effect(Effects.sendToPlayer(mover, GameMessage.Rejected.of(reason)))
        .build();
  }

  private static boolean wins(List<String> board, String mark) {
    for (int[] line : LINES) {
      if (board.get(line[0]).equals(mark)
          && board.get(line[1]).equals(mark)
          && board.get(line[2]).equals(mark)) {
        return true;
      }
    }
    return false;
  }

  /** {@code winner == null} is a draw: both teams share placement 1. */
  private static GameOutcome outcome(TicTacToeState s, UUID winner) {
    var b = GameOutcome.builder();
    if (winner == null) {
      b.teamResult(s.xTeam(), 1, Map.of()).teamResult(s.oTeam(), 1, Map.of()).draw(true);
    } else {
      UUID loser = s.other(winner);
      b.teamResult(s.teamOf(winner), 1, Map.of())
          .teamResult(s.teamOf(loser), 2, Map.of())
          .draw(false);
    }
    return b.playerResult(s.xPlayer(), Map.of()).playerResult(s.oPlayer(), Map.of()).build();
  }
}
