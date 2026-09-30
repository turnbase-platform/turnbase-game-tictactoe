package io.turnbase.games.tictactoe;

import io.turnbase.gdk.GameState;
import java.util.List;
import java.util.UUID;

/**
 * The whole game: nine cells (empty string, {@code "X"} or {@code "O"}), the two seats and whose
 * turn it is. A value type — records, {@code List}, {@code String} and {@code UUID} only — so it
 * round-trips through the platform's serializer (backend-gdk-api.md §5.1).
 */
public record TicTacToeState(
    List<String> board, UUID xPlayer, UUID xTeam, UUID oPlayer, UUID oTeam, UUID turn, boolean over)
    implements GameState {

  static final String EMPTY = "";
  static final String X = "X";
  static final String O = "O";

  /** The mark the given player plays. */
  String markOf(UUID player) {
    return player.equals(xPlayer) ? X : O;
  }

  UUID other(UUID player) {
    return player.equals(xPlayer) ? oPlayer : xPlayer;
  }

  UUID teamOf(UUID player) {
    return player.equals(xPlayer) ? xTeam : oTeam;
  }
}
