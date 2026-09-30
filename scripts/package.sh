#!/usr/bin/env bash
#
# Assembles the game bundle (bundle-format.md §2.1) at target/<GAME_ID>.zip:
#
#   manifest.json, INFO.md, backend/tictactoe.jar, frontend/main.js
#
# The archive is named after the game's fixed id, because that is how the platform's seeder
# learns it (local-environment.md §6, IMP-GATE-71). Run `./mvnw package && npm run build` first.
set -euo pipefail
cd "$(dirname "$0")/.."

GAME_ID="2cc66e36-52e6-4144-9a10-09d09c982ce4"
DIR=target/bundle

[ -f target/tictactoe.jar ] || { echo "target/tictactoe.jar missing — run ./mvnw package" >&2; exit 1; }
[ -f "$DIR/frontend/main.js" ] || { echo "$DIR/frontend/main.js missing — run npm run build" >&2; exit 1; }

mkdir -p "$DIR/backend"
cp manifest.json INFO.md "$DIR/"
cp target/tictactoe.jar "$DIR/backend/tictactoe.jar"

rm -f "target/$GAME_ID.zip"
# -X: no extra file attributes; manifest.json first, though only its location is fixed.
(cd "$DIR" && zip -qrX "../$GAME_ID.zip" manifest.json INFO.md backend frontend)
echo "target/$GAME_ID.zip"
