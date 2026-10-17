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

| Component         | Responsibility                                                      | Talks to                                     |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| Next.js web       | UI, editor, duel room, auth session                                 | NestJS API (REST + Socket.io), Supabase Auth |
| NestJS API        | Business rules, grading, rewards, duels, AI calls                   | Postgres, Piston, Gemini                     |
| Piston            | Runs untrusted code in isolated, time- and memory-limited processes | Nothing (no outbound network)                |
| Supabase Postgres | All persistent data                                                 | —                                            |
| Supabase Auth     | Issues JWTs                                                         | —                                            |
| Gemini API        | Error explanations and hints                                        | —                                            |

### Why it is shaped this way

- **Everything goes through the API.** The browser never calls Piston or Gemini, so test cases, answers and keys stay server-side.
- **Piston lives next to the API on a VPS.** It needs a privileged Docker container, which Railway, Render and Fly do not offer; it is reached only on the internal Docker network.
- **WebSockets for duels.** Polling every second would be slow and wasteful; the server pushes progress the moment a submission is graded.
- **Postgres, not files.** Progress, XP and duel results need transactions and unique constraints to stay correct.

## 2. Low-level design rules (plain NestJS, ADR-015)

### 2.1 Layers

```
Controller / Gateway  →  Service  →  DbService (Drizzle) · PistonClient · GeminiClient
   HTTP / WS + DTOs       the rules     one small class per outside system
```

| Layer                | Job                                                      | May import                                   | Must not import                     |
| -------------------- | -------------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| Controller / Gateway | Validate the DTO, call one service method, return result | Its service, DTOs                            | Drizzle, `DbService`, clients, SDKs |
| Service              | Business rules and database queries                      | `DbService`, schema, clients, other services | `@google/genai`, raw Piston HTTP    |
| Client               | Talk to one outside system                               | Its SDK or `fetch`, `ConfigService`          | Services, controllers               |

### 2.2 Module layout (every feature module)

```
modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts      or <feature>.gateway.ts
  <feature>.service.ts         business rules + Drizzle queries
  dto/
    <action>.dto.ts
  <feature>.service.spec.ts    only when the module has logic worth testing
```

Shared infrastructure, one job each:

```
src/db/schema.ts                     Drizzle table definitions
src/db/db.module.ts                  global module exporting DbService
src/db/db.service.ts                 the one Drizzle instance
src/db/migrations/                   drizzle-kit output
src/integrations/piston.client.ts    the only file that calls Piston
src/integrations/gemini.client.ts    the only file that imports @google/genai
src/common/http-exception.filter.ts  shapes errors as { error: { code, message } }
```

### 2.3 Dependency injection

Plain classes, injected by type. No interfaces or Symbol tokens.

```ts
// submissions.service.ts
@Injectable()
export class SubmissionsService {
  constructor(
    private readonly db: DbService,
    private readonly piston: PistonClient,
    private readonly gamification: GamificationService,
  ) {}
}
```

In a test, stub a client with `Test.createTestingModule({ ... }).overrideProvider(PistonClient).useValue({ run: vi.fn() })`.

### 2.4 Patterns and where they live

| Pattern            | Used for                         | Location                                  |
| ------------------ | -------------------------------- | ----------------------------------------- |
| Client (adapter)   | Piston and Gemini behind a class | `integrations/*.client.ts`                |
| Guard              | JWT auth                         | `modules/auth/jwt-auth.guard.ts`          |
| DTO                | Validated request shapes         | `*/dto/*.dto.ts`                          |
| Transition check   | Duel lifecycle                   | `canTransition(from, to)` in `duels/`     |
| Conditional update | Single duel winner               | `DuelsService`, `where winner_id is null` |
| Unique constraint  | Idempotent XP                    | `xp_events` (see `DATA_MODEL.md`)         |

### 2.5 Cross-module calls

Services call each other directly; there are no domain events in v1. After a lesson completes, `SubmissionsService` calls `GamificationService` to award XP and update the streak. After a duel finishes, `DuelsService` calls `RatingsService`. These calls happen **after** the write that caused them succeeds, and each one is idempotent (unique constraints in `DATA_MODEL.md`).

### 2.6 Errors

Services throw Nest's built-in exceptions with the code from `API_SPEC.md`:

```ts
throw new ForbiddenException({
  code: 'LESSON_LOCKED',
  message: 'Finish the previous lesson first.',
});
```

One global `HttpExceptionFilter` turns every exception into `{ error: { code, message } }`.

## 3. Key flows

### 3.1 Submit an exercise

1. `POST /submissions` with `{ exerciseId, code }`; `JwtAuthGuard` attaches `userId`.
2. Controller validates the DTO and calls `SubmissionsService.submit(userId, exerciseId, code)`.
3. Service loads the exercise (with hidden tests) through `DbService` and checks the lesson is unlocked for this user (else `LESSON_LOCKED`).
4. Service calls `PistonClient.run` once per test (sample and hidden), comparing trimmed stdout (ADR-011).
5. Service inserts a `submissions` row.
6. If every test passed and the lesson was not already complete: mark progress complete, then call `GamificationService` to award XP (unique on source + source id) and update the streak.
7. Controller returns `{ status, testsPassed, totalTests, results }`, with sample-test details only.

### 3.2 Live duel

1. Client connects to the `/duels` namespace with its JWT; gateway verifies it.
2. `queue:join` → `MatchmakingService` adds the player to the in-memory queue.
3. When two players are waiting, `DuelsService` creates a `duels` row (`matched`), picks a problem, and joins both sockets to room `duel:<id>`.
4. Server emits `duel:start` with the buggy code, sample tests and `endsAt`; status → `in_progress`.
5. `duel:submit` → service grades through the same `PistonClient`, saves a `duel_submissions` row, and emits `duel:progress` (passed / total) to the room.
6. A fully passing submission tries `update duels set winner_id = $1, status = 'completed' where id = $2 and winner_id is null`. Exactly one caller updates a row; that caller emits `duel:end` and calls `RatingsService`.
7. A server timer at `endsAt` finishes the duel by most tests passed, or a draw.
8. `RatingsService` applies ELO to both players in one transaction.

## 4. Deployment

| Piece           | Host                     | Notes                                                                                   |
| --------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `apps/web`      | Vercel                   | Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `apps/api`      | VPS, Docker Compose      | Behind Caddy for HTTPS; env in `apps/api/.env`                                          |
| Piston          | Same VPS, Docker Compose | `privileged: true`; not exposed publicly                                                |
| Postgres + Auth | Supabase cloud           | Migrations run from CI or by hand with drizzle-kit                                      |
| CI              | GitHub Actions           | Lint, typecheck, test on every push                                                     |

## 5. Later (Phase 3, only when needed)

| Add back                                        | When                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Interfaces for the executor or AI tutor         | Actually swapping Piston or Gemini, or adding a second one  |
| Domain events (`@nestjs/event-emitter`)         | Several modules react to one action and direct calls tangle |
| Redis for matchmaking queue + Socket.io adapter | Running more than one API instance                          |
| BullMQ for background jobs                      | Grading or AI calls need to leave the request path          |
| Piston on its own machine                       | Heavy grading load                                          |
