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
| 429  | `RATE_LIMITED` / `DAILY_LIMIT_REACHED`    | Throttle or AI cap                   |
| 502  | `EXECUTOR_UNAVAILABLE` / `AI_UNAVAILABLE` | Piston or Gemini down                |

## REST endpoints

### Health

| Method | Path      | Auth   | Response                                   |
| ------ | --------- | ------ | ------------------------------------------ |
| GET    | `/health` | Public | `{ status: "ok", piston: "ok" \| "down" }` |

### Users — M2

| Method | Path  | Body                        | Response                                                                                           |
| ------ | ----- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/me` | —                           | `{ id, username, avatarUrl, xp, streak: { current, longest, freezes }, rating, lessonsCompleted }` |
| PATCH  | `/me` | `{ username?, avatarUrl? }` | updated profile                                                                                    |

### Lessons — M3

| Method | Path                  | Response                                                                                                         |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/courses`            | `[{ id, slug, title, language }]`                                                                                |
| GET    | `/courses/:slug/path` | `{ course, units: [{ id, title, lessons: [{ id, title, state: "locked" \| "active" \| "completed" }] }] }`       |
| GET    | `/lessons/:id`        | `{ id, title, exercise: { id, prompt, starterCode, sampleTests: [{ input, expectedOutput }] } }` — 403 if locked |

`hidden_tests` must never appear in any of these responses. Add a test that asserts this.

### Submissions — M4

| Method | Path                       | Body                                           | Response                                            |
| ------ | -------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| POST   | `/submissions`             | `{ exerciseId: uuid, code: string (≤ 20 KB) }` | see below                                           |
| GET    | `/submissions?exerciseId=` | —                                              | last 10 of the user's submissions for that exercise |

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

### Gamification — M5

| Method | Path                           | Response                                                                     |
| ------ | ------------------------------ | ---------------------------------------------------------------------------- |
| GET    | `/leaderboard/weekly?limit=50` | `{ weekStart, entries: [{ rank, userId, username, xp }], me: { rank, xp } }` |
| GET    | `/leaderboard/rating?limit=50` | `{ entries: [{ rank, userId, username, elo }], me: { rank, elo } }` (M9)     |

### AI tutor — M6

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

## Socket.io — duels (M8)

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
