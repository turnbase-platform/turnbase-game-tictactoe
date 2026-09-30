package io.turnbase.games.tictactoe;

/** The action payload a frontend sends: the cell to mark, {@code 0}–{@code 8}, row-major. */
public record Move(int cell) {}
