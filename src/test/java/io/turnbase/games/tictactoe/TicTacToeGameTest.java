package io.turnbase.games.tictactoe;

import static org.assertj.core.api.Assertions.assertThat;

import io.turnbase.gdk.context.ActionContext;
import io.turnbase.gdk.context.InitContext;
import io.turnbase.gdk.context.PlayerLeftContext;
import io.turnbase.gdk.context.PlayerLeftReason;
import io.turnbase.gdk.context.ResyncContext;
import io.turnbase.gdk.context.ViewerRole;
import io.turnbase.gdk.effect.BroadcastEffect;
import io.turnbase.gdk.effect.Effect;
import io.turnbase.gdk.effect.GameOverEffect;
import io.turnbase.gdk.effect.SendToPlayerEffect;
import io.turnbase.gdk.model.GameParameters;
import io.turnbase.gdk.model.Player;
import io.turnbase.gdk.model.Team;
import io.turnbase.gdk.result.ActionResult;
import io.turnbase.serialization.GdkSerialization;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TicTacToeGameTest {

  private final TicTacToeGame game = new TicTacToeGame();
  private final GdkSerialization serialization = new GdkSerialization();

  private final UUID teamX = UUID.randomUUID();
  private final UUID teamO = UUID.randomUUID();
  private final Player x = new Player(UUID.randomUUID(), "Alice", teamX);
  private final Player o = new Player(UUID.randomUUID(), "Bob", teamO);
  private TicTacToeState state;

  @BeforeEach
  void init() {
    InitContext ctx =
        new InitContext() {
          @Override
          public List<Team> teams() {
            return List.of(new Team(teamX, "X 1", List.of(x)), new Team(teamO, "O 1", List.of(o)));
          }

          @Override
          public GameParameters parameters() {
            return new GameParameters() {
              @Override
              public int getInt(String key) {
                throw new UnsupportedOperationException();
              }

              @Override
              public double getDecimal(String key) {
                throw new UnsupportedOperationException();
              }

              @Override
              public boolean getBoolean(String key) {
                throw new UnsupportedOperationException();
              }

              @Override
              public String getString(String key) {
                throw new UnsupportedOperationException();
              }

              @Override
              public String getEnum(String key) {
                throw new UnsupportedOperationException();
              }

              @Override
              public boolean contains(String key) {
                return false;
              }

              @Override
              public Set<String> keys() {
                return Set.of();
              }
            };
          }

          @Override
          public long seed() {
            return 1L;
          }
        };
    state = roundTrip(game.onInit(ctx).state());
  }

  @Test
  void xMovesFirstOnAnEmptyBoard() {
    assertThat(state.board()).containsOnly("").hasSize(9);
    assertThat(state.turn()).isEqualTo(x.id());
  }

  @Test
  void anAcceptedMoveMarksTheCellPassesTheTurnAndBroadcasts() {
    var result = play(x, 4);
    state = roundTrip(result.state());

    assertThat(state.board().get(4)).isEqualTo("X");
    assertThat(state.turn()).isEqualTo(o.id());
    assertThat(result.effects()).anyMatch(e -> e instanceof BroadcastEffect);
    assertThat(result.effects()).noneMatch(e -> e instanceof GameOverEffect);
  }

  @Test
  void movingOutOfTurnIsRefusedToTheMoverAloneAndChangesNothing() {
    var result = play(o, 0);

    assertThat(result.state()).isEqualTo(state);
    assertThat(result.effects()).singleElement().isInstanceOf(SendToPlayerEffect.class);
    assertThat(((SendToPlayerEffect) result.effects().get(0)).playerId()).isEqualTo(o.id());
  }

  @Test
  void anOccupiedOrOutOfRangeCellIsRefused() {
    state = play(x, 0).state();

    assertThat(play(o, 0).state()).isEqualTo(state);
    assertThat(play(o, 9).state()).isEqualTo(state);
    assertThat(play(o, -1).state()).isEqualTo(state);
  }

  @Test
  void threeInARowEndsTheGameWithTheMoverAsWinner() {
    int[] moves = {0, 3, 1, 4};
    Player[] by = {x, o, x, o};
    for (int i = 0; i < moves.length; i++) {
      state = roundTrip(play(by[i], moves[i]).state());
    }
    var last = play(x, 2);

    GameOverEffect over = gameOver(last.effects());
    assertThat(over.outcome().draw()).isFalse();
    assertThat(over.outcome().teamResults())
        .extracting(r -> r.teamId() + ":" + r.placement())
        .containsExactly(teamX + ":1", teamO + ":2");
    assertThat(last.state().over()).isTrue();
  }

  @Test
  void aFullBoardWithNoLineIsADrawSharingFirstPlace() {
    // X O X / X O O / O X X — no line
    int[] cells = {0, 1, 2, 4, 3, 5, 7, 6, 8};
    Player[] by = {x, o, x, o, x, o, x, o, x};
    ActionResult<TicTacToeState> last = null;
    for (int i = 0; i < cells.length; i++) {
      last = play(by[i], cells[i]);
      state = roundTrip(last.state());
    }

    GameOverEffect over = gameOver(last.effects());
    assertThat(over.outcome().draw()).isTrue();
    assertThat(over.outcome().teamResults()).extracting(r -> r.placement()).containsOnly(1);
  }

  @Test
  void noMoveIsAcceptedAfterTheGameIsOver() {
    var over = TicTacToeGameTest.this.finishedGame();
    assertThat(play(o, 8).state()).isEqualTo(over);
  }

  @Test
  void leavingMidGameForfeitsToTheOpponent() {
    var result =
        game.onPlayerLeft(
            state,
            new PlayerLeftContext() {
              @Override
              public Player player() {
                return x;
              }

              @Override
              public PlayerLeftReason reason() {
                return PlayerLeftReason.LEFT;
              }
            });

    GameOverEffect over = gameOver(result.effects());
    assertThat(over.outcome().teamResults().get(0).teamId()).isEqualTo(teamO);
    assertThat(result.state().over()).isTrue();
  }

  @Test
  void leavingAfterTheGameEndedChangesNothing() {
    var over = finishedGame();
    var result =
        game.onPlayerLeft(
            over,
            new PlayerLeftContext() {
              @Override
              public Player player() {
                return o;
              }

              @Override
              public PlayerLeftReason reason() {
                return PlayerLeftReason.GRACE_PERIOD_EXPIRED;
              }
            });
    assertThat(result.state()).isEqualTo(over);
    assertThat(result.effects()).isEmpty();
  }

  @Test
  void resyncShowsAPlayerTheirMarkAndASpectatorNone() {
    state = play(x, 4).state();

    var forO = (GameMessage.View) game.onResync(state, resync(ViewerRole.PLAYER, o)).view();
    var forSpectator =
        (GameMessage.View) game.onResync(state, resync(ViewerRole.SPECTATOR, null)).view();

    assertThat(forO.yourMark()).isEqualTo("O");
    assertThat(forO.board().get(4)).isEqualTo("X");
    assertThat(forSpectator.yourMark()).isEmpty();
  }

  @Test
  void everyStateAndEventPayloadSurvivesTheExecutingRoundTrip() {
    var result = play(x, 4);
    assertThat(serialization.roundTrips(result.state(), TicTacToeState.class)).isTrue();
    assertThat(serialization.roundTrips(new Move(3), Move.class)).isTrue();
  }

  private ActionResult<TicTacToeState> play(Player who, int cell) {
    return game.onAction(
        state,
        new ActionContext() {
          @Override
          public Player player() {
            return who;
          }

          @Override
          public <A> A action(Class<A> type) {
            return type.cast(new Move(cell));
          }
        });
  }

  private TicTacToeState finishedGame() {
    int[] moves = {0, 3, 1, 4, 2};
    Player[] by = {x, o, x, o, x};
    for (int i = 0; i < moves.length; i++) {
      state = roundTrip(play(by[i], moves[i]).state());
    }
    return state;
  }

  private static ResyncContext resync(ViewerRole role, Player viewer) {
    return new ResyncContext() {
      @Override
      public ViewerRole role() {
        return role;
      }

      @Override
      public Optional<Player> viewer() {
        return Optional.ofNullable(viewer);
      }
    };
  }

  private static GameOverEffect gameOver(List<Effect> effects) {
    return effects.stream()
        .filter(GameOverEffect.class::isInstance)
        .map(GameOverEffect.class::cast)
        .findFirst()
        .orElseThrow();
  }

  private TicTacToeState roundTrip(TicTacToeState s) {
    return serialization.readState(
        serialization.writeState(s, 10L * 1024 * 1024), TicTacToeState.class);
  }
}
