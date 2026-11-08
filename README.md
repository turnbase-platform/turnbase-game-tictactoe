# turnbase-game-tictactoe

> Part of [TurnBase](https://github.com/turnbase-platform/turnbase), a platform for turn-based multiplayer games — this is the first official game, and the reference for writing one. Start at the [umbrella README](https://github.com/turnbase-platform/turnbase#readme).

Tic-Tac-Toe for TurnBase. It exists to prove the Game Development Kit is implementable by someone outside
the platform team, so it is a **consumer**: its backend (Java 21, runs in the Game Host's Espresso) compiles
against `io.github.turnbase-platform:turnbase-sdk` (scope `provided`) and its frontend bundles
`@turnbase-platform/gdk`. A dependency on `turnbase-game-host` or `turnbase-common` is banned by the enforcer.

## Build

```bash
./mvnw verify                  # backend: Spotless, unit tests, JaCoCo >= 70 %
npm ci && npm run lint && npm run typecheck && npm test && npm run build
./scripts/package.sh           # -> target/seed/2cc66e36-52e6-4144-9a10-09d09c982ce4.zip
```

## Run and test

`2cc66e36-…` is the game's fixed id: the platform's seeder takes the file-name stem as `game_id`. Copy the
zip into the directory `turnbase.seed.bundles-dir` names to seed it into a local stack. Try it without the
platform: `cd target/bundle && mvn io.github.turnbase-platform:turnbase-harness:run`.

`@turnbase-platform/gdk` is the `npm pack` tarball attached to the `turnbase-sdk` `v0.1.0` GitHub Release,
depended on by URL (ADR-0022).

## Layout

`src/main/java` is the backend game, `src/main/ts` the frontend, `manifest.json` the bundle
manifest, `scripts/package.sh` the packager. For how a game fits the platform see the umbrella's
[`ARCHITECTURE.md`](https://github.com/turnbase-platform/turnbase/blob/master/ARCHITECTURE.md).

## Third-party licences

What this repository distributes is audited for its dependencies' licences (allowed families:
`docs/implementation/conventions.md` §6 *Third-party licences*). The report is generated, not committed:

```bash
./mvnw org.codehaus.mojo:license-maven-plugin:2.8.0:add-third-party -Dlicense.excludedScopes=test,provided
# -> target/generated-sources/license/THIRD-PARTY.txt
```

The SDK is `provided`, so the backend jar carries no third-party code. The frontend: `npm run licenses` (pinned checker, `licenses.csv`, git-ignored). The bundle embeds no fonts.

## Licence

Apache-2.0, see [`LICENSE`](LICENSE).
