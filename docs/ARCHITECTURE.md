# Loophole — Architecture

How Loophole is built: the high-level design (HLD) first, then the low-level design (LLD) rules every module follows, then the two flows that matter most.

## 1. High-level design

```
 Browser (Next.js on Vercel)
   │  sign-in only ───────────────────────────────┐
   │  HTTPS REST            Socket.io (duels)     │
   ▼                         ▼                    │
 ┌──────────── One VPS · Docker Compose ───────┐  │
 │  Caddy (HTTPS) → NestJS API ──HTTP──► Piston │  │
 └──────────────────┬──────────────┬───────────┘  │
                    ▼              ▼              ▼
             Supabase Postgres   Gemini API   Supabase Auth
```

| Component | Responsibility | Talks to |
| --- | --- | --- |
| Next.js web | UI, editor, duel room, auth session | NestJS API (REST + Socket.io), Supabase Auth |
| NestJS API | Business rules, grading, rewards, duels, AI calls | Postgres, Piston, Gemini |
| Piston | Runs untrusted code in isolated, time- and memory-limited processes | Nothing (no outbound network) |
| Supabase Postgres | All persistent data | — |
| Supabase Auth | Issues JWTs | — |
| Gemini API | Error explanations and hints | — |

### Why it is shaped this way

- **Everything goes through the API.** The browser never calls Piston or Gemini, so test cases, answers and keys stay server-side.
- **Piston lives next to the API on a VPS.** It needs a privileged Docker container, which Railway, Render and Fly do not offer; it is reached only on the internal Docker network.
- **WebSockets for duels.** Polling every second would be slow and wasteful; the server pushes progress the moment a submission is graded.
- **Postgres, not files.** Progress, XP and duel results need transactions and unique constraints to stay correct.

## 2. Low-level design rules

### 2.1 Layers

```
Controller / Gateway  →  Service  →  Domain (entities + interfaces)  ←  Infrastructure
     HTTP, WS only       rules         plain TypeScript, no framework     Drizzle, Piston, Gemini
```

| Layer | May import | Must not import |
| --- | --- | --- |
| Controller / Gateway | Its service, DTOs | Repositories, Drizzle, SDKs |
| Service | Domain interfaces (via DI tokens), EventEmitter2, other services' public methods | Drizzle, `@supabase/*`, Piston client, `@google/genai` |
| Domain | Nothing outside the domain | NestJS decorators, any SDK |
| Infrastructure | Domain interfaces it implements, SDKs | Services, controllers |

### 2.2 Module layout (every feature module)

```
modules/<feature>/
  <feature>.module.ts        wiring: binds DI tokens to concrete classes
  <feature>.controller.ts    or <feature>.gateway.ts
  <feature>.service.ts
  domain/
    <entity>.entity.ts
    <thing>.interface.ts     interface + Symbol token
  infra/
    drizzle-<entity>.repository.ts
    <vendor>-<thing>.ts
  dto/
    <action>.dto.ts
  __tests__/
    <feature>.service.spec.ts
    fakes/
```

### 2.3 Dependency injection with interfaces

TypeScript interfaces vanish at runtime, so each interface exports a `Symbol` token. Services inject the token; the module binds it.

```ts
// domain/code-executor.interface.ts
export const CODE_EXECUTOR = Symbol('CODE_EXECUTOR');
export interface ICodeExecutor { run(input: RunInput): Promise<RunResult>; }

// submissions.module.ts
providers: [{ provide: CODE_EXECUTOR, useClass: PistonExecutor }]

// submissions.service.ts
constructor(@Inject(CODE_EXECUTOR) private readonly executor: ICodeExecutor) {}
```

Swapping Piston for Judge0, or Drizzle for something else, changes only the module binding.

### 2.4 Patterns and where they live

| Pattern | Used for | Location |
| --- | --- | --- |
| Repository | All database access | `*/infra/drizzle-*.repository.ts` |
| Strategy | Swappable code executor | `submissions/domain/code-executor.interface.ts` |
| Adapter | Gemini behind `IAiTutor` | `ai/infra/gemini-tutor.ts` |
| Observer (domain events) | XP, streaks, ratings react to events | `gamification/*.listener.ts`, `duels/rating.listener.ts` |
| State machine | Duel lifecycle | `duels/domain/duel-state-machine.ts` |
| Guard | JWT auth | `auth/jwt-auth.guard.ts` |
| DTO | Validated request shapes | `*/dto/*.dto.ts` |

### 2.5 Domain events

| Event | Emitted by | Payload | Listeners |
| --- | --- | --- | --- |
| `lesson.completed` | SubmissionsService | userId, lessonId, submissionId, completedAt | XpListener, StreakListener, CertificateListener |
| `duel.finished` | DuelsService | duelId, winnerId \| null, playerA, playerB, finishedAt | RatingListener |

Events are emitted **after** the database write that caused them succeeds. Listeners must be idempotent (see `DATA_MODEL.md` unique constraints).

### 2.6 Errors

- Domain code throws typed errors (`LessonLockedError`, `DailyLimitReachedError`, `IllegalTransitionError`).
- A global exception filter maps them to HTTP codes (403, 429, 409). Services never throw `HttpException`.

## 3. Key flows

### 3.1 Submit an exercise

1. `POST /submissions` with `{ exerciseId, code }`; `JwtAuthGuard` attaches `userId`.
2. Controller validates the DTO and calls `SubmissionsService.submit(userId, exerciseId, code)`.
3. Service loads the exercise (with hidden tests) through `IExerciseRepository`; checks the lesson is unlocked for this user.
4. Service calls `ICodeExecutor.run` once per test (sample and hidden, or batched), collecting pass/fail.
5. Service builds a `Submission` entity and saves it through `ISubmissionRepository`.
6. If every test passed and the lesson was not already complete: mark progress complete, then emit `lesson.completed`.
7. Controller returns `{ status, testsPassed, totalTests, results }` — sample-test details only.
8. XpListener inserts an `xp_events` row (unique on source + source id); StreakListener updates the streak.

### 3.2 Live duel

1. Client connects to the `/duels` namespace with its JWT; gateway verifies it.
2. `queue:join` → MatchmakingService adds the player to the in-memory queue.
3. Matcher pairs two players → DuelsService creates a `duels` row (`matched`), picks a problem, and joins both sockets to room `duel:<id>`.
4. Server emits `duel:start` with the buggy code, sample tests and `endsAt`; state → `in_progress`.
5. `duel:submit` → service grades through the same `ICodeExecutor`, saves a `duel_submissions` row, and emits `duel:progress` (passed / total) to the room.
6. A fully passing submission tries `update duels set winner_id = $1, status = 'completed' where id = $2 and winner_id is null`. Exactly one caller updates a row; that caller emits `duel:end` and `duel.finished`.
7. A server timer at `endsAt` finishes the duel by most tests passed, or a draw.
8. RatingListener applies ELO in one transaction.

## 4. Deployment

| Piece | Host | Notes |
| --- | --- | --- |
| `apps/web` | Vercel | Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `apps/api` | VPS, Docker Compose | Behind Caddy for HTTPS; env in `apps/api/.env` |
| Piston | Same VPS, Docker Compose | `privileged: true`; not exposed publicly |
| Postgres + Auth | Supabase cloud | Migrations run from CI or by hand with drizzle-kit |
| CI | GitHub Actions | Lint, typecheck, test on every push |

## 5. Scaling notes (not needed for v1)

- More than one API instance → move matchmaking queue and Socket.io adapter to Redis; swap the in-process event emitter for BullMQ.
- Heavy grading load → Piston on its own machine, API calls it over a private network.
- None of these change service code, only module bindings and infrastructure.
