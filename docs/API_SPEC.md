# Loophole — API Spec

Base URL: `https://api.<domain>` (local: `http://localhost:3001`). All bodies are JSON. Types shared with the frontend live in `packages/shared/src/`.

## Conventions

- **Auth:** `Authorization: Bearer <supabase access token>` on every route unless marked Public.
- **Errors:** `{ "error": { "code": "LESSON_LOCKED", "message": "Finish the previous lesson first." } }`

| HTTP | code                                      | When                                 |
| ---- | ----------------------------------------- | ------------------------------------ |
| 400  | `VALIDATION_FAILED`                       | DTO validation failed                |
| 401  | `UNAUTHENTICATED`                         | Missing or invalid token             |
| 403  | `LESSON_LOCKED`                           | Lesson not yet unlocked              |
| 404  | `NOT_FOUND`                               | Resource does not exist              |
| 409  | `ILLEGAL_TRANSITION`                      | Duel action not allowed in its state |
| 409  | `USERNAME_TAKEN`                          | `PATCH /me` with a username in use   |
| 429  | `RATE_LIMITED` / `DAILY_LIMIT_REACHED`    | Throttle or AI cap                   |
| 500  | `INTERNAL_ERROR`                          | Unexpected server error              |
| 502  | `EXECUTOR_UNAVAILABLE` / `AI_UNAVAILABLE` | Piston or Gemini down                |

## REST endpoints

### Health

| Method | Path      | Auth   | Response                                   |
| ------ | --------- | ------ | ------------------------------------------ |
| GET    | `/health` | Public | `{ status: "ok", piston: "ok" \| "down" }` |

### Users — S1

| Method | Path  | Body                        | Response                                                                                           |
| ------ | ----- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/me` | —                           | `{ id, username, avatarUrl, xp, streak: { current, longest, freezes }, rating, lessonsCompleted }` |
| PATCH  | `/me` | `{ username?, avatarUrl? }` | updated profile                                                                                    |

### Lessons — S2

| Method | Path                  | Response                                                                                                                                                                    |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/courses`            | `[{ id, slug, title, language }]`                                                                                                                                           |
| GET    | `/courses/:slug/path` | `{ course, units: [{ id, title, lessons: [{ id, title, state: "locked" \| "active" \| "completed" }] }] }`                                                                  |
| GET    | `/lessons/:id`        | `{ id, title, exercise: { id, prompt, starterCode, sampleTests: [{ input, expectedOutput }] } }` — 403 `LESSON_LOCKED` if locked, 404 if unknown, 400 if `id` is not a uuid |

`hidden_tests` must never appear in any of these responses. `test/lessons.e2e-spec.ts` searches every response body for it.

### Submissions — S3

| Method | Path                       | Body                                           | Response                                                                                                                                              |
| ------ | -------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/submissions`             | `{ exerciseId: uuid, code: string (≤ 20 KB) }` | 201, see below — 403 `LESSON_LOCKED`, 404 unknown exercise, 400 for any extra field (e.g. test cases), 429 `RATE_LIMITED`, 502 `EXECUTOR_UNAVAILABLE` |
| GET    | `/submissions?exerciseId=` | —                                              | last 10 of the user's submissions for that exercise, newest first: `[{ id, status, testsPassed, totalTests, code, submittedAt }]`                     |

```json
{
  "id": "uuid",
  "status": "passed",
  "testsPassed": 3,
  "totalTests": 3,
  "lessonCompleted": true,
  "xpAwarded": 10,
  "results": [
    {
      "kind": "sample",
      "passed": true,
      "input": "2 3",
      "expected": "5",
      "actual": "5"
    },
    { "kind": "hidden", "passed": true }
  ],
  "stderr": ""
}
```

Hidden test results show only `passed`, never input or expected output. Throttle: 10 per minute per user.

- `status`: `passed` (every test passed), `error` (some test crashed or ran out of time), otherwise `failed`.
- `expected` and `actual` are the trimmed strings that were compared (ADR-011).
- `stderr` is the first non-empty stderr of a **sample** test, never a hidden one (a traceback can quote the hidden input). If none, and any test ran out of time, it is a fixed time-limit message. Truncated to 4 KB.
- `lessonCompleted` is true whenever every test passed, including a repeat pass of a finished lesson. `xpAwarded` is 10 on the first completion of a lesson and 0 on every later pass (FR-09). Only a first completion moves the streak.
- A 502 saves nothing.

### Gamification — S4

| Method | Path                           | Response                                                                     |
| ------ | ------------------------------ | ---------------------------------------------------------------------------- |
| GET    | `/leaderboard/weekly?limit=50` | `{ weekStart, entries: [{ rank, userId, username, xp }], me: { rank, xp } }` |
| GET    | `/leaderboard/rating?limit=50` | `{ entries: [{ rank, userId, username, elo }], me: { rank, elo } }` (S8)     |

- Rating: only players who have finished a duel are listed; until then `me` is `{ rank: null, elo: 1200 }`. Equal Elo shares a rank. `GET /me` `rating` and `duel:matched` `opponent.elo` use the same numbers.

- Weekly: XP from `xp_events` created since Monday 00:00 IST; `weekStart` is that instant (ISO). `limit` is 1–50 (default 50), else 400.
- Equal XP shares a rank (1, 1, 3); ties are listed by username. `me` is always present: `{ rank: null, xp: 0 }` with no XP this week.
- `GET /me` gives all-time `xp`. `streak.current` shows 0 once a day is missed, even before the next lesson resets it; `freezes` stays 0 until Phase 3.

### AI tutor — S5

| Method | Path          | Body                                 | Response                                                |
| ------ | ------------- | ------------------------------------ | ------------------------------------------------------- |
| POST   | `/ai/explain` | `{ submissionId: uuid }`             | `{ explanation, line: number \| null, remainingToday }` |
| POST   | `/ai/hint`    | `{ exerciseId: uuid, code: string }` | `{ hint, remainingToday }`                              |

The server loads the exercise, failing test and stderr itself; the client sends only IDs and current code.

- Both return 200. `remainingToday` counts down from `AI_DAILY_LIMIT` (20) per IST day; the next request after 0 is 429 `DAILY_LIMIT_REACHED`.
- 502 `AI_UNAVAILABLE` when Gemini fails or answers badly; that request is not counted.
- Explain: 404 for an unknown submission or someone else's. Hint: 403 `LESSON_LOCKED`, 404 unknown exercise. Neither is counted.
- `explanation` and `hint` are at most 120 words; `line` is null unless it points at a real line of the submitted code; a hint that contains a code block is replaced by a generic one.

### Certificates — M10

| Method | Path                  | Auth   | Response                              |
| ------ | --------------------- | ------ | ------------------------------------- |
| GET    | `/certificates`       | Yes    | the user's certificates               |
| GET    | `/certificates/:slug` | Public | `{ username, courseTitle, issuedAt }` |

## Socket.io — duels (S7)

Namespace: `/duels`. Connect with `auth: { token: <supabase access token> }`; the server rejects bad tokens on connect.

### Client → server

| Event          | Payload            | Allowed when                         |
| -------------- | ------------------ | ------------------------------------ |
| `queue:join`   | `{}`               | not in queue or duel                 |
| `queue:leave`  | `{}`               | in queue                             |
| `duel:submit`  | `{ duelId, code }` | duel `in_progress`, user is a player |
| `duel:forfeit` | `{ duelId }`       | duel `in_progress`                   |

### Server → client

| Event           | Payload                                                                                          | Sent to            |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| `queue:joined`  | `{ position }`                                                                                   | the player         |
| `duel:matched`  | `{ duelId, opponent: { username, elo } }`                                                        | both players       |
| `duel:start`    | `{ duelId, problem: { title, description, buggyCode, sampleTests }, endsAt }`                    | room `duel:<id>`   |
| `duel:progress` | `{ userId, testsPassed, totalTests }`                                                            | room               |
| `duel:result`   | `{ testsPassed, totalTests, results }`                                                           | the submitter only |
| `duel:end`      | `{ duelId, result: "win" \| "draw" \| "forfeit", winnerId, ratingChange: { [userId]: number } }` | room               |
| `error`         | `{ code, message }`                                                                              | the socket         |

Rules: the opponent's code is never sent; `endsAt` is an ISO timestamp the client counts down to; duel submissions are throttled to 1 every 3 s per player.

- **Connect:** a missing or bad token fails the handshake with `connect_error`, `err.data = { code: "UNAUTHENTICATED", message }`. A player mid-duel who reconnects (reload, second tab) gets `duel:matched` and `duel:start` again for that duel.
- **Errors** arrive as `error` events with the REST codes: `VALIDATION_FAILED` (bad payload), `NOT_FOUND` (unknown duel or not a player), `ILLEGAL_TRANSITION` (duel not running, or `queue:join` while in a duel), `RATE_LIMITED` (throttle).
- `duel:result` uses the lesson grading (hidden tests report only `passed`); `duel:progress` goes to both players.
- `duel:end` reaches both players exactly once. `ratingChange` is each player's Elo change (S8): K = 32, a draw scores 0.5, a forfeit counts as a loss, and the two changes always add up to 0. A submission graded after `endsAt` or after the end changes nothing.
- At most 20 duels run at once (NFR-07); beyond that, matched pairs wait in the queue.
