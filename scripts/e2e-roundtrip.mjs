#!/usr/bin/env node
// IMP-M3-10 round trip against the local stack (compose or the Docker Desktop chart):
//   create -> join -> start -> several turns -> outcome -> history
// as the seeded users alice and bob, over the platform's real REST + STOMP surfaces. Exits
// non-zero on the first thing that does not happen. Usage:
//   node scripts/e2e-roundtrip.mjs            # PLATFORM_URL=http://127.0.0.1:8080 by default
import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const GAME_ID = "2cc66e36-52e6-4144-9a10-09d09c982ce4";
const BASE = process.env.PLATFORM_URL ?? "http://127.0.0.1:8080";
const HOST = process.env.PLATFORM_HOST ?? "turnbase.localhost:8080";
const ORIGIN = `http://${HOST}`;
const TIMEOUT_MS = 30_000;

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};
const step = (message) => console.log(`- ${message}`);

async function api(method, path, cookie, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Host: HOST,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { res, json: text ? JSON.parse(text) : null };
}

async function login(username) {
  const { res, json } = await api("POST", "/api/auth/login", null, {
    usernameOrEmail: username,
    password: "password",
  });
  if (res.status !== 200) fail(`login ${username}: ${String(res.status)}`);
  const cookie = res.headers.getSetCookie()[0]?.split(";")[0];
  if (!cookie) fail(`login ${username}: no session cookie`);
  return { cookie, userId: json.userId, username };
}

/** A STOMP 1.2 client over one WebSocket, with a promise-returning `waitFor`. */
class Stomp {
  constructor(cookie) {
    this.frames = [];
    this.waiters = [];
    this.ws = new WebSocket(`${BASE.replace("http", "ws")}/ws`, {
      headers: { Host: HOST, Origin: ORIGIN, Cookie: cookie },
    });
    this.ready = new Promise((resolve, reject) => {
      this.ws.on("open", () =>
        this.ws.send("CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nhost:turnbase\n\n\0"),
      );
      this.ws.on("error", reject);
      this.onConnected = resolve;
    });
    this.ws.on("message", (data) => {
      for (const raw of data.toString().split("\0")) {
        const text = raw.replace(/^\n+/, "");
        if (text === "") continue;
        const [head, ...rest] = text.split("\n\n");
        const [command, ...headerLines] = head.split("\n");
        const headers = Object.fromEntries(
          headerLines.map((l) => [l.split(":")[0], l.slice(l.indexOf(":") + 1)]),
        );
        const frame = { command, headers, body: rest.join("\n\n") };
        if (command === "CONNECTED") this.onConnected();
        if (command === "ERROR") console.error("STOMP ERROR", frame.headers.message, frame.body);
        if (process.env.DEBUG && command === "MESSAGE")
          console.error("<<", frame.headers.destination, frame.body);
        this.frames.push(frame);
        this.waiters = this.waiters.filter((w) => !w(frame));
      }
    });
  }
  subscribe(destination) {
    this.ws.send(`SUBSCRIBE\nid:${randomUUID()}\ndestination:${destination}\n\n\0`);
  }
  send(destination, envelope) {
    const body = JSON.stringify(envelope);
    this.ws.send(`SEND\ndestination:${destination}\ncontent-type:application/json\n\n${body}\0`);
  }
  command(destination, type, payload) {
    this.send(destination, { type, correlationId: randomUUID(), payload: payload ?? {} });
  }
  /** Resolves with the first message (past or future) whose parsed body satisfies `predicate`. */
  waitFor(description, predicate) {
    const check = (frame) => {
      if (frame.command !== "MESSAGE") return false;
      try {
        const message = JSON.parse(frame.body);
        return predicate(message) ? message : false;
      } catch {
        return false;
      }
    };
    for (const frame of this.frames) {
      const hit = check(frame);
      if (hit) return Promise.resolve(hit);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timed out waiting for ${description}`)),
        TIMEOUT_MS,
      );
      this.waiters.push((frame) => {
        const hit = check(frame);
        if (!hit) return false;
        clearTimeout(timer);
        resolve(hit);
        return true;
      });
    });
  }
  close() {
    this.ws.close();
  }
}

try {
  step("log in as alice and bob");
  const alice = await login("alice");
  const bob = await login("bob");

  step("alice creates a room for tic-tac-toe");
  const created = await api("POST", "/api/rooms", alice.cookie, {
    gameId: GAME_ID,
    visibility: "PUBLIC",
    spectatingEnabled: true,
  });
  if (created.res.status !== 201)
    fail(`create room: ${String(created.res.status)} ${JSON.stringify(created.json)}`);
  const roomId = created.json.roomId ?? created.json.id;
  step(`room ${roomId}`);

  step("bob joins");
  const joined = await api("POST", `/api/rooms/${roomId}/participants`, bob.cookie, {
    role: "PLAYER",
  });
  if (joined.res.status !== 201)
    fail(`join: ${String(joined.res.status)} ${JSON.stringify(joined.json)}`);

  const a = new Stomp(alice.cookie);
  const b = new Stomp(bob.cookie);
  await Promise.all([a.ready, b.ready]);
  for (const s of [a, b]) {
    s.subscribe(`/topic/room.${roomId}`);
    s.subscribe("/user/queue/errors");
  }

  step("bob readies up, alice starts");
  b.command(`/app/room.${roomId}.member`, "TOGGLE_READY", { ready: true });
  await a.waitFor("bob ready", (m) => m.type === "READINESS_CHANGED");
  a.command(`/app/room.${roomId}.host`, "START_GAME");
  const started = await a.waitFor("GAME_STARTED", (m) => m.type === "GAME_STARTED");
  const sessionId = started.payload.sessionId;
  step(`session ${sessionId}`);

  for (const s of [a, b]) {
    s.subscribe(`/topic/game.${sessionId}`);
    s.subscribe("/user/queue/game");
    s.command(`/app/game.${sessionId}.sync`, "REQUEST_GAME_SYNC");
  }
  const syncA = await a.waitFor("alice GAME_SYNC", (m) => m.type === "GAME_SYNC");
  const syncB = await b.waitFor("bob GAME_SYNC", (m) => m.type === "GAME_SYNC");
  const marks = {
    [alice.userId]: syncA.payload.view.yourMark,
    [bob.userId]: syncB.payload.view.yourMark,
  };
  step(`marks ${JSON.stringify(marks)}`);
  const first = syncA.payload.view.yourMark === "X" ? [a, alice, b, bob] : [b, bob, a, alice];
  const [xs, xu, os, ou] = first;

  // X takes the top row while O plays the middle row: X wins on the fifth move (X O X O X …).
  const script = [
    [xs, xu, 0],
    [os, ou, 3],
    [xs, xu, 1],
    [os, ou, 4],
    [xs, xu, 2],
  ];
  let expectedMoves = 0;
  for (const [stomp, user, cell] of script) {
    stomp.command(`/app/game.${sessionId}.action`, "SUBMIT_ACTION", { cell });
    expectedMoves += 1;
    const n = expectedMoves;
    await a.waitFor(
      `move ${String(n)}`,
      (m) => m.type === "GAME_EVENT" && m.payload.type === "move" && m.payload.cell === cell,
    );
    step(`${user.username} marked cell ${String(cell)}`);
  }

  const over = await a.waitFor("GAME_OVER", (m) => m.type === "GAME_OVER");
  step(`game over: ${JSON.stringify(over.payload.results)}`);
  if (over.payload.results.winnerMark !== "X") fail("expected X to win");

  step("history lists the finished game");
  let entry;
  for (let attempt = 0; attempt < 20 && !entry; attempt++) {
    const history = await api("GET", "/api/users/me/history", alice.cookie);
    const items = history.json?.items ?? history.json?.content ?? [];
    entry = items.find(
      (i) => JSON.stringify(i).includes(GAME_ID) || JSON.stringify(i).includes(sessionId),
    );
    if (!entry) await new Promise((r) => setTimeout(r, 500));
  }
  if (!entry) fail("no history entry for the finished game");

  a.close();
  b.close();
  console.log("PASS: create -> join -> start -> 5 turns -> outcome -> history");
  process.exit(0);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
