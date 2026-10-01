package io.turnbase.games.tictactoe;

/**
 * The action payload a frontend sends: the cell to mark, {@code 0}–{@code 8}, row-major. Nullable
 * because a client can send {@code {}}; the game rejects that rather than failing the hook.
 */
public record Move(Integer cell) {}
