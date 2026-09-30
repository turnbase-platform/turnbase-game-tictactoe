# turnbase-game-tictactoe — CLAUDE.md

The first official game. **A consumer of the published GDK, not part of the platform.**

**This file is additive** — corpus, registry and conventions live in the parent repository
(`../docs/implementation/registry.md` `IMP-M3-10`; `../docs/implementation/conventions.md`).

- **The Done-when clause fails if this repo needs `turnbase-game-host` or `turnbase-common`** — the
  enforcer bans both. If the game cannot be written against `turnbase-sdk` alone, the fix is in the SDK
  or its spec, not here.
- The backend is Java 21 and runs in Espresso: no Java 22+ APIs, no I/O, no clocks, no unseeded
  randomness (`backend-gdk-api.md` §9). State is a value (`§5.1`): records, `List`, `String`, `UUID`.
- `TicTacToeState` is what the round trip test serializes; keep it that way.
- Bundle layout is `bundle-format.md` §2; the archive's file-name stem is the fixed game id.
