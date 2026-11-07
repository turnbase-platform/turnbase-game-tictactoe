# turnbase-game-tictactoe

The first official TurnBase game (`IMP-M3-10`). It exists to prove the GDK contract is implementable by
someone outside the platform team, so it is a **consumer**: its backend compiles against
`io.github.turnbase-platform:turnbase-sdk` (scope `provided`) and its frontend bundles `@turnbase-platform/gdk`. A dependency on
`turnbase-game-host` or `turnbase-common` is banned by the enforcer.

```bash
./mvnw verify                  # backend: Spotless, unit tests, JaCoCo ≥ 70 %
npm ci && npm run lint && npm run typecheck && npm test && npm run build
./scripts/package.sh           # → target/seed/2cc66e36-52e6-4144-9a10-09d09c982ce4.zip
```

`2cc66e36-…` is the game's fixed id: the platform's seeder takes the file-name stem as `game_id`
(`local-environment.md` §6). Try it without the platform: `cd target/bundle &&
mvn io.github.turnbase-platform:turnbase-harness:run`.

`vendor/turnbase-gdk-0.1.0.tgz` is `npm pack` of `turnbase-sdk`'s FE half — a bootstrap stand-in for
the npm package until the SDK's first release tag exists (`conventions.md` §5).

## Third-party licences

What this repository distributes is audited for its dependencies' licences (allowed families:
`docs/implementation/conventions.md` §6 *Third-party licences*). The report is generated, not committed:

```bash
./mvnw org.codehaus.mojo:license-maven-plugin:2.8.0:add-third-party -Dlicense.excludedScopes=test,provided
# -> target/generated-sources/license/THIRD-PARTY.txt
```

The SDK is `provided`, so the backend jar carries no third-party code. The frontend: `npm run licenses` (pinned checker, `licenses.csv`, git-ignored). The bundle embeds no fonts.
