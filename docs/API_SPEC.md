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

- Weekly: XP from `xp_events` created since Monday 00:00 IST; `weekStart` is that instant (ISO). `limit` is 1–50 (default 50), else 400.
- Equal XP shares a rank (1, 1, 3); ties are listed by username. `me` is always present: `{ rank: null, xp: 0 }` with no XP this week.
- `GET /me` gives all-time `xp`. `streak.current` shows 0 once a day is missed, even before the next lesson resets it; `freezes` stays 0 until Phase 3.

### AI tutor — S5

| Method | Path          | Body                                 | Response                                                |
| ------ | ------------- | ------------------------------------ | ------------------------------------------------------- |
| POST   | `/ai/explain` | `{ submissionId: uuid }`             | `{ explanation, line: number \| null, remainingToday }` |
| POST   | `/ai/hint`    | `{ exerciseId: uuid, code: string }` | `{ hint, remainingToday }`                              |

The server loads the exercise, failing test and stderr itself; the client sends only IDs and current code.

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
