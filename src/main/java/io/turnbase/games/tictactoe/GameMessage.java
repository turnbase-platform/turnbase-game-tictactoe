package io.turnbase.games.tictactoe;

import java.util.List;
import java.util.UUID;

/**
 * The event payloads this game sends to its frontend. {@code type} discriminates them, so the
 * frontend's {@code TEvent} is a discriminated union (frontend-gdk-api.md §3).
 */
public final class GameMessage {

  private GameMessage() {}

  /** The full position, sent as the first event to every viewer and again on reconnection. */
  public record View(String type, List<String> board, UUID turn, boolean over, String yourMark) {
    static View of(TicTacToeState s, String yourMark) {
      return new View("view", s.board(), s.turn(), s.over(), yourMark);
    }
  }

  /** One accepted move, broadcast to everyone. */
  public record MovePlayed(String type, int cell, String mark, UUID next) {
    static MovePlayed of(int cell, String mark, UUID next) {
      return new MovePlayed("move", cell, mark, next);
    }
  }

  /** A refused move, sent to the mover alone. The game state is unchanged. */
  public record Rejected(String type, String reason) {
    static Rejected of(String reason) {
      return new Rejected("rejected", reason);
    }
  }

  /** The final result, delivered as the game-over results payload. */
  public record Result(String type, String winnerMark, String reason) {
    static Result of(String winnerMark, String reason) {
      return new Result("result", winnerMark, reason);
    }
  }
}
