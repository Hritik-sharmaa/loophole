# Loophole — Architecture Diagrams

Diagrams of the system as it is built today (Phases 1–2 done, Phase 3 in progress). Source of truth for the rules is `docs/ARCHITECTURE.md`; these pictures follow the code in `apps/` and `infra/`.

`architecture.excalidraw` has the system diagram (top) and the API low-level design (below it) as hand-drawn sketches. Open it at <https://excalidraw.com> or with the VS Code Excalidraw extension.

**High-level design (HLD)**

1. System and deployment
2. Backend modules and layers
3. Flow: submit an exercise
4. Flow: live duel
5. Data model

**Low-level design (LLD)**

6. Classes: learning path (lessons, submissions, XP, AI, certificates)
7. Classes: duels
8. Pure rule functions and who calls them
9. State: duel lifecycle (server)
10. State: duel room (client)
11. State: lesson unlocks and the streak rule
12. Frontend layers

`certificates` (diagrams 6 and 8) is uncommitted work in progress and is not in the HLD diagrams yet.

## 1. System and deployment

```mermaid
flowchart TB
    learner([Learner in browser])

    subgraph vercel["Vercel · apps/web (Next.js App Router, React 19)"]
        pages["Pages (app/)<br/>/ · /login · /learn · /lessons/[id]<br/>/duels · /leaderboard · /profile"]
        ui["Components<br/>CodeMirror editor · lesson path<br/>tutor panel · duel room"]
        state["Client state<br/>TanStack Query · zustand · zod"]
        libapi["lib/api.ts<br/>REST + Bearer JWT"]
        libsock["lib/socket.ts<br/>Socket.io /duels"]
        libsb["lib/supabase.ts<br/>sign-in only"]
        pages --> ui --> state
        state --> libapi
        state --> libsock
    end

    subgraph vps["AWS VPS · Docker Compose (infra/docker-compose.prod.yml)"]
        caddy["Caddy 2<br/>:443 HTTPS · Let's Encrypt<br/>reverse_proxy → api:3001 (incl. WS)"]
        subgraph apic["api container · NestJS 12 · Node 24"]
            api["REST controllers + /duels gateway<br/>services · DbService · clients"]
        end
        piston["Piston container (privileged)<br/>127.0.0.1:2000 · internal network only<br/>Python runtime · no outbound network"]
    end

    subgraph supa["Supabase cloud"]
        pg[("Postgres<br/>Drizzle migrations")]
        sbauth["Supabase Auth<br/>Google OAuth (PKCE) · issues JWTs"]
    end

    gemini["Google Gemini API<br/>explain · hint"]
    shared["packages/shared<br/>TS types for REST + socket payloads"]
    content["content/*.json<br/>40 Python lessons · 15 duel problems"]
    ci["GitHub Actions CI<br/>format · lint · typecheck · unit + e2e (PGlite)"]

    learner --> pages
    libapi -- "HTTPS REST" --> caddy
    libsock -- "WSS" --> caddy
    libsb -- "sign-in / session (anon key)" --> sbauth
    caddy --> api
    api -- "HTTP: run code" --> piston
    api -- "SQL (postgres.js pool)" --> pg
    api -- "verify JWT" --> sbauth
    api -- "@google/genai" --> gemini
    content -. "run-seed.ts (idempotent)" .-> pg
    shared -. "imported by" .-> vercel
    shared -. "imported by" .-> apic
```

Why it looks like this:

- The browser only talks to Supabase Auth to sign in. Every other call goes through the API, so hidden tests, duel solutions and API keys stay on the server.
- Piston needs a privileged container, so it runs on the same VPS as the API. Only the internal Docker network can reach it.
- Matchmaking, duel timers and the Piston run queue live in memory, so v1 runs exactly one API instance.

## 2. Backend modules and layers

Controllers and the gateway only validate and delegate (ADR-015). Services hold the rules. Each outside system has exactly one client class.

```mermaid
flowchart TB
    subgraph global["Global request pipeline (app.module.ts)"]
        direction LR
        guard["JwtAuthGuard<br/>@Public() skips"] --> throttle["HttpThrottlerGuard<br/>120 req/min per user"] --> pipe["ValidationPipe<br/>class-validator DTOs"] --> filter["HttpExceptionFilter<br/>{ error: { code, message } }"]
    end

    subgraph ctl["Controllers / Gateway"]
        cMe["UsersController<br/>GET · PATCH /me"]
        cCourses["CoursesController<br/>GET /courses · /courses/:slug/path"]
        cLessons["LessonsController<br/>GET /lessons/:id"]
        cSub["SubmissionsController<br/>POST · GET /submissions"]
        cWeekly["LeaderboardController<br/>GET /leaderboard/weekly"]
        cRating["RatingsController<br/>GET /leaderboard/rating"]
        cAi["AiController<br/>POST /ai/explain · /ai/hint"]
        cHealth["HealthController<br/>GET /health"]
        gDuels["DuelsGateway (Socket.io /duels)<br/>queue:join · queue:leave<br/>duel:submit · duel:forfeit"]
    end

    subgraph svc["Services (business rules + Drizzle queries)"]
        sUsers["UsersService"]
        sLessons["LessonsService<br/>lesson states / unlocks"]
        sSub["SubmissionsService<br/>grading.ts · run-tests.ts"]
        sGam["GamificationService<br/>XP · streaks (IST days)"]
        sRat["RatingsService<br/>elo.ts"]
        sAi["AiService<br/>tutor guards · daily cap"]
        sDuels["DuelsService<br/>duel-rules.ts · timers"]
        sMatch["MatchmakingService<br/>in-memory queue"]
        sHealth["HealthService"]
    end

    subgraph infra["Shared infrastructure"]
        db["DbService<br/>one Drizzle instance"]
        piston["PistonClient<br/>serial run queue (ADR-018)"]
        gem["GeminiClient<br/>only importer of @google/genai"]
        sba["SupabaseAuthClient<br/>token checks"]
    end

    global --> ctl
    cMe --> sUsers
    cCourses --> sLessons
    cLessons --> sLessons
    cSub --> sSub
    cWeekly --> sGam
    cRating --> sRat
    cAi --> sAi
    cHealth --> sHealth
    gDuels --> sDuels

    sUsers --> sGam
    sUsers --> sRat
    sSub --> sLessons
    sSub --> sUsers
    sSub --> sGam
    sAi --> sLessons
    sAi --> sUsers
    sDuels --> sMatch
    sDuels --> sUsers
    sDuels --> sRat

    sSub --> piston
    sDuels --> piston
    sHealth --> piston
    sAi --> gem
    guard --> sba
    gDuels --> sba
    svc --> db
```

## 3. Flow: submit an exercise

```mermaid
sequenceDiagram
    autonumber
    actor L as Learner
    participant W as Next.js (lesson page)
    participant A as API · SubmissionsController
    participant S as SubmissionsService
    participant P as PistonClient → Piston
    participant G as GamificationService
    participant DB as Postgres

    L->>W: Click "Submit"
    W->>A: POST /submissions { exerciseId, code } + Bearer JWT
    A->>A: JwtAuthGuard → userId · throttle · DTO validation
    A->>S: submit(userId, exerciseId, code)
    S->>DB: load exercise (with hidden tests) + check lesson unlocked
    alt lesson locked
        S-->>W: 403 LESSON_LOCKED
    end
    loop each sample + hidden test, one at a time (ADR-018)
        S->>P: run(python, code, stdin)
        P-->>S: stdout / stderr / timeout
        Note over S: compare trimmed stdout (ADR-011)<br/>after a time-out, skip the rest
    end
    S->>DB: insert submissions row
    opt all passed and lesson not yet complete
        S->>DB: mark user_progress complete
        S->>G: award XP + update streak
        G->>DB: insert xp_events (unique user+source+sourceId)
        G->>DB: upsert streaks
    end
    S-->>A: { status, testsPassed, totalTests, results }
    A-->>W: 201 with sample-test details only (never hidden_tests)
    W-->>L: Results, XP, confetti
```

## 4. Flow: live duel

```mermaid
sequenceDiagram
    autonumber
    actor P1 as Player A
    actor P2 as Player B
    participant GW as DuelsGateway (/duels)
    participant DS as DuelsService
    participant MM as MatchmakingService
    participant PC as PistonClient → Piston
    participant RS as RatingsService
    participant DB as Postgres

    P1->>GW: connect { auth.token }
    GW->>GW: SupabaseAuthClient verifies JWT · join room user:ID
    P1->>GW: queue:join
    GW->>DS: join(userId)
    DS->>MM: enqueue A
    DS-->>P1: queue:joined { position }
    P2->>GW: connect + queue:join
    DS->>MM: enqueue B → pair (A, B)
    DS->>DB: insert duels (matched), pick duel_problem
    DS-->>P1: duel:matched + duel:start { buggyCode, sampleTests, endsAt }
    DS-->>P2: duel:matched + duel:start
    Note over DS: status → in_progress · arm timer at endsAt<br/>both sockets join room duel:ID

    P1->>GW: duel:submit { duelId, code }
    GW->>DS: submit (rate limited 20/min)
    DS->>PC: run each test
    PC-->>DS: outputs
    DS->>DB: insert duel_submissions
    DS-->>P1: duel:result (own details)
    DS-->>P2: duel:progress { passed / total } (room)

    alt fully passing submission
        DS->>DB: BEGIN · update duels set winner_id, status='completed'<br/>where id=$id and winner_id is null
        DS->>RS: apply Elo (rows locked in id order, same tx)
        RS->>DB: update ratings · COMMIT
        DS-->>P1: duel:end { result, winnerId, ratingChange }
        DS-->>P2: duel:end
    else timer reaches endsAt
        DS->>DB: finish by most tests passed, or draw (+ Elo, same tx)
        DS-->>P1: duel:end
        DS-->>P2: duel:end
    else player forfeits, or last tab closed for 30 s
        DS->>DB: forfeit result (+ Elo, same tx)
        DS-->>P2: duel:opponent / duel:end
    end
    Note over DS: On API start, timers are re-armed for duels still in_progress
```

## 5. Data model

`auth.users` belongs to Supabase. Every user-owned table hangs off `profiles` with `on delete cascade`.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "id"
    COURSES ||--o{ UNITS : has
    UNITS ||--o{ LESSONS : has
    LESSONS ||--|| EXERCISES : has
    PROFILES ||--o{ USER_PROGRESS : completes
    LESSONS ||--o{ USER_PROGRESS : "completed by"
    PROFILES ||--o{ SUBMISSIONS : makes
    EXERCISES ||--o{ SUBMISSIONS : "graded for"
    PROFILES ||--o{ XP_EVENTS : earns
    PROFILES ||--o| STREAKS : has
    PROFILES ||--o{ AI_USAGE : "uses per day"
    PROFILES ||--o| RATINGS : has
    DUEL_PROBLEMS ||--o{ DUELS : "used in"
    PROFILES ||--o{ DUELS : "player_a / player_b / winner"
    DUELS ||--o{ DUEL_SUBMISSIONS : has
    PROFILES ||--o{ DUEL_SUBMISSIONS : makes

    PROFILES {
        uuid id PK "= auth.users.id"
        text username UK
        text avatar_url
    }
    COURSES {
        uuid id PK
        text slug UK
        text language
        text title
    }
    UNITS {
        uuid id PK
        uuid course_id FK
        text slug
        int position
    }
    LESSONS {
        uuid id PK
        uuid unit_id FK
        text slug
        int position
    }
    EXERCISES {
        uuid id PK
        uuid lesson_id FK, UK
        text starter_code
        jsonb sample_tests
        jsonb hidden_tests "never sent to client"
    }
    USER_PROGRESS {
        uuid user_id PK, FK
        uuid lesson_id PK, FK
        text status
        timestamptz completed_at
    }
    SUBMISSIONS {
        uuid id PK
        uuid user_id FK
        uuid exercise_id FK
        text status
        int tests_passed
        int total_tests
        jsonb results
    }
    XP_EVENTS {
        uuid id PK
        uuid user_id FK
        int amount
        text source "unique with user_id, source_id"
        uuid source_id
    }
    STREAKS {
        uuid user_id PK, FK
        int current_streak
        int longest_streak
        date last_active_date
        int freezes_available
    }
    AI_USAGE {
        uuid user_id PK, FK
        date day PK
        int count
    }
    RATINGS {
        uuid user_id PK, FK
        int elo "default 1200"
        int wins
        int losses
        int draws
    }
    DUEL_PROBLEMS {
        uuid id PK
        text slug UK
        text buggy_code
        jsonb sample_tests
        jsonb hidden_tests "never sent to client"
        int difficulty
    }
    DUELS {
        uuid id PK
        uuid problem_id FK
        uuid player_a FK
        uuid player_b FK
        text status "matched | in_progress | completed"
        text result "win | draw | forfeit"
        uuid winner_id FK "set once: where winner_id is null"
        timestamptz ends_at
    }
    DUEL_SUBMISSIONS {
        uuid id PK
        uuid duel_id FK
        uuid user_id FK
        int tests_passed
        int total_tests
    }
```

---

# Low-level design

The LLD follows the plain-NestJS rules in `docs/ARCHITECTURE.md` §2 (ADR-015):

- Controllers and the gateway are thin.
- Services own the rules and the Drizzle queries.
- The rules that are easy to get wrong live in pure functions with no I/O, so they can be unit-tested.
- Each outside system sits behind exactly one client class.
- Dependency injection is by class. There are no interfaces or tokens.

## 6. Classes: learning path

Every service also depends on `DbService`. Those arrows are left out to keep the picture readable.

```mermaid
classDiagram
    direction TB

    class CoursesController {
        <<controller>>
        +list() CourseSummary[]
        +path(user, slug) CoursePath
    }
    class LessonsController {
        <<controller>>
        +get(user, id) LessonDetail
    }
    class SubmissionsController {
        <<controller>>
        +create(user, dto) SubmissionResult
        +list(user, query) SubmissionSummary[]
    }
    class UsersController {
        <<controller>>
        +getMe(user) MeResponse
        +updateMe(user, dto) MeResponse
    }
    class LeaderboardController {
        <<controller>>
        +weekly(user, query) WeeklyLeaderboard
    }
    class AiController {
        <<controller>>
        +explain(user, dto) ExplainResponse
        +hint(user, dto) HintResponse
    }
    class CertificatesController {
        <<in progress>>
        +listMine(user) CertificateSummary[]
        +getPublic(slug) PublicCertificate
    }

    class LessonsService {
        <<service>>
        +listCourses() CourseSummary[]
        +getPath(userId, courseSlug) CoursePath
        +getLesson(userId, lessonId) LessonDetail
        +assertUnlocked(userId, lessonId, courseId) void
        -orderedLessons(courseId)
        -statesFor(userId, courseId)
    }
    class SubmissionsService {
        <<service>>
        +submit(user, dto) SubmissionResult
        +list(userId, exerciseId) SubmissionSummary[]
    }
    class GamificationService {
        <<service>>
        +awardLesson(userId, lessonId) xpAwarded
        +stats(userId) xpAndStreak
        +weekly(userId, limit) WeeklyLeaderboard
        -streakState(userId)
    }
    class CertificatesService {
        <<in progress>>
        +issueIfComplete(userId, lessonId) slugOrNull
        +listMine(userId) CertificateSummary[]
        +getPublic(slug) PublicCertificate
    }
    class UsersService {
        <<service>>
        +getMe(user) MeResponse
        +ensureProfile(user) void
        +updateMe(user, dto) MeResponse
        -getOrCreate(user) Profile
        -toMe(profile) MeResponse
    }
    class RatingsService {
        <<service>>
        +elosOf(userIds) Map
    }
    class AiService {
        <<service>>
        -dailyLimit number
        +explain(user, submissionId) ExplainResponse
        +hint(user, dto) HintResponse
        -withDailyCap(userId, fn)
    }

    class PistonClient {
        <<client>>
        -queue Promise
        +isUp() boolean
        +run(language, code, stdin) RunResult
        -execute(language, code, stdin) RunResult
    }
    class GeminiClient {
        <<client>>
        -ai GoogleGenAI
        -model string
        +explainError(input) explanationAndLine
        +giveHint(input) hint
        -generate(kind, prompt)
    }
    class DbService {
        <<infrastructure>>
        +drizzle Db
        +onModuleDestroy() void
    }
    class RunResult {
        <<type>>
        +stdout string
        +stderr string
        +exitCode number
        +timedOut boolean
    }

    CoursesController --> LessonsService
    LessonsController --> LessonsService
    SubmissionsController --> SubmissionsService
    UsersController --> UsersService
    LeaderboardController --> GamificationService
    AiController --> AiService
    CertificatesController --> CertificatesService

    SubmissionsService --> LessonsService : assertUnlocked
    SubmissionsService --> UsersService : ensureProfile
    SubmissionsService --> GamificationService : awardLesson
    SubmissionsService --> CertificatesService : issueIfComplete
    SubmissionsService --> PistonClient : run via runTests
    AiService --> LessonsService : assertUnlocked
    AiService --> UsersService : ensureProfile
    AiService --> GeminiClient : explainError, giveHint
    UsersService --> GamificationService : stats
    UsersService --> RatingsService : elosOf
    PistonClient ..> RunResult
    GamificationService ..> DbService : every service uses DbService
```

## 7. Classes: duels

Socket events reach `DuelsGateway`, and it hands each one to `DuelsService`. `DuelsService` owns all live duel state: timers, absent-player timers and the per-user rate limit. It pushes events back through the Socket.io namespace it receives in `attach(io)`.

```mermaid
classDiagram
    direction TB

    class DuelsGateway {
        <<gateway>>
        +afterInit(io) void
        +handleConnection(socket) void
        +handleDisconnect(socket) void
        +joinQueue(socket) void
        +leaveQueue(socket) void
        +submit(socket, dto) void
        +forfeit(socket, dto) void
    }
    class SupabaseAuthClient {
        <<client>>
        +verify(token) AuthUser
    }
    class DuelsService {
        <<service>>
        -io Namespace
        -timers Map
        -absentTimers Map
        -lastSubmitAt Map
        -actions RateLimiter
        -matchTimer Timeout
        -starting number
        +attach(io) void
        +onApplicationBootstrap() void
        +connect(socket, user) void
        +disconnect(socketId, userId) void
        +joinQueue(userId, socketId) void
        +leaveQueue(userId) void
        +submit(userId, dto) void
        +forfeit(userId, duelId) void
        +forfeitIfAbsent(userId) void
        +finishOnTimeout(duelId) void
        -announce(duel, resume) void
        -finish(duel, result, winnerId) void
        -scheduleTimeout(duelId, endsAt) void
        -emit(room, event, data) void
    }
    class MatchmakingService {
        <<in memory>>
        -queue WaitingPlayer[]
        +join(userId, socketId, elo) number
        +leave(userId) void
        +leaveSocket(socketId) void
        +takePair(now) pairOrNull
    }
    class WaitingPlayer {
        <<type>>
        +userId string
        +socketId string
        +elo number
        +joinedAt number
    }
    class RatingsService {
        <<service>>
        +applyDuel(tx, playerA, playerB, scoreA) ratingChange
        +elosOf(userIds) Map
        +leaderboard(userId, limit) RatingLeaderboard
        -record(tx, row)
    }
    class RatingsController {
        <<controller>>
        +rating(user, query) RatingLeaderboard
    }
    class UsersService {
        <<service>>
        +ensureProfile(user) void
    }
    class PistonClient {
        <<client>>
        +run(language, code, stdin) RunResult
    }
    class RateLimiter {
        <<common>>
        -hits Map
        +hit(key, now) boolean
    }

    DuelsGateway --> SupabaseAuthClient : verify JWT on connect
    DuelsGateway --> DuelsService
    DuelsService --> MatchmakingService : join, leave, takePair
    DuelsService --> RatingsService : elosOf, applyDuel in same tx
    DuelsService --> UsersService : ensureProfile
    DuelsService --> PistonClient : run via runTests
    DuelsService *-- RateLimiter : 20 actions per min
    MatchmakingService o-- WaitingPlayer
    RatingsController --> RatingsService
```

Notes on `DuelsService` state:

- `timers`: one per running duel (duelId to timeout). Its size is the active-duel count, capped at 20.
- `absentTimers`: one per player whose last tab closed (userId to timeout). It fires the 30 s forfeit.
- `lastSubmitAt`: enforces one `duel:submit` every 3 s per player.
- `onApplicationBootstrap()`: re-arms timers for duels still `in_progress`.

## 8. Pure rule functions and who calls them

These files do no I/O. They hold the logic AGENTS.md rule 6 says to test: grading, streaks, Elo and the duel winner. Each has a spec in `__tests__/`.

```mermaid
flowchart LR
    subgraph services["Services"]
        sUsers[UsersService]
        sLessons[LessonsService]
        sSub[SubmissionsService]
        sAi[AiService]
        sGam[GamificationService]
        sRat[RatingsService]
        sDuels[DuelsService]
        sMatch[MatchmakingService]
    end

    subgraph rules["Pure functions (no I/O, unit-tested)"]
        username["users/username.ts<br/>toUsernameBase() · withRandomSuffix()<br/>3–20 chars of a-z 0-9 _"]
        lstates["lessons/lesson-states.ts<br/>lessonStates(ordered, completed)<br/>locked · active · completed"]
        runtests["submissions/run-tests.ts<br/>runTests(piston, lang, code, sample, hidden)<br/>one at a time, stop after a time-out"]
        grading["submissions/grading.ts<br/>grade(runs) · outputMatches()<br/>trimmed stdout equality, stderr up to 4 KB"]
        guards["ai/tutor-guards.ts<br/>limitWords(120) · containsCodeBlock()<br/>validLine() · GENERIC_HINT"]
        streak["gamification/streak.ts<br/>nextStreak() · visibleStreak()<br/>1 freeze per 7 days, max 2"]
        ist["common/ist-calendar.ts<br/>istDate() · istWeekStart()<br/>addDays() · daysBetween()"]
        elo["ratings/elo.ts<br/>expectedScore() · eloChanges()<br/>K = 32, start 1200"]
        drules["duels/duel-rules.ts<br/>canTransition() · assertTransition()<br/>timeoutOutcome() · 5 min, 30 s forfeit"]
        band["duels/matchmaking.service.ts<br/>ratingBand(joinedAt, now)<br/>150 wide, +100 every 15 s"]
    end

    sUsers --> username
    sLessons --> lstates
    sSub --> runtests --> grading
    sDuels --> runtests
    sDuels --> grading
    sAi --> guards
    sAi --> ist
    sGam --> streak --> ist
    sGam --> ist
    sRat --> elo
    sDuels --> drules
    sMatch --> band
```

## 9. State: duel lifecycle (server)

`duel-rules.ts` allows only these steps. `assertTransition` throws `409 ILLEGAL_TRANSITION` on any other step. `waiting` exists only in memory (the matchmaking queue). The other states are `duels.status` in Postgres.

```mermaid
stateDiagram-v2
    [*] --> waiting : player joins the queue
    waiting --> [*] : leaves the queue or disconnects
    waiting --> matched : takePair() finds a rival in rating band, duels row inserted
    matched --> in_progress : announce() sends duel start, endsAt = now + 5 min, timer armed
    in_progress --> completed : fully passing submission (win)
    in_progress --> completed : endsAt reached, timeoutOutcome() gives win or draw
    in_progress --> completed : forfeit, or last tab gone for 30 s
    completed --> [*]

    note right of in_progress
        Timers are re-armed on API start.
        Overdue duels finish at once.
        Submissions: 1 every 3 s per player.
    end note
    note right of completed
        One transaction: set winner_id
        where winner_id is null, then Elo
        for both players (rows locked in id order).
        Exactly one caller wins the update.
    end note
```

## 10. State: duel room (client)

The `/duels` page keeps the duel in a `useReducer` (`apps/web/lib/use-duel-socket.ts`). Server events drive every transition. The client never decides the result.

```mermaid
stateDiagram-v2
    [*] --> connecting
    connecting --> idle : socket connected
    connecting --> offline : connect error
    offline --> idle : reconnected
    idle --> queued : queue joined (position)
    queued --> idle : left the queue, or an error while queued
    queued --> playing : duel start (after duel matched)
    idle --> playing : duel start for a resumed duel (reload or second tab)
    playing --> ended : duel end
    ended --> idle : reset, find another duel

    note right of playing
        duel progress updates my score and theirs
        duel result shows my last run
        duel opponent starts the 30 s away countdown
        submitting is true while a submit is in flight
    end note
```

## 11. State: lesson unlocks and the streak rule

`lessonStates()` walks the course in path order. Completed lessons stay open, the first unfinished lesson is active, and every lesson after it is locked. `LessonsService.assertUnlocked` applies it to submissions and AI hints too, so a locked lesson is blocked on the server, not just hidden in the UI.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> locked
    locked --> active : previous lesson completed
    active --> completed : every sample and hidden test passes, +10 XP once
    completed --> completed : re-submits never pay again (xp_events unique)
```

`nextStreak(prev, today)` runs when a lesson is completed for the first time. Days are IST calendar days.

```mermaid
flowchart TD
    start([new lesson completed today]) --> last{last active day?}
    last -- "none" --> first["current = 1"]
    last -- "today or later" --> same["no change"]
    last -- "yesterday" --> plus["current + 1"]
    last -- "missed k days" --> enough{"k ≤ freezes in hand?"}
    enough -- yes --> spend["spend k freezes<br/>current + 1"]
    enough -- no --> reset["current = 1<br/>keep freezes"]
    first --> seventh{"current is a multiple of 7?"}
    plus --> seventh
    spend --> seventh
    reset --> seventh
    seventh -- yes --> earn["freezes + 1 (max 2)"]
    seventh -- no --> save
    earn --> save["longest = max(longest, current)<br/>last active = today, upsert streaks"]
```

## 12. Frontend layers

Pages never call `fetch` or Socket.io directly. Data goes through TanStack Query hooks, then `apiFetch`. The duel room goes through `useDuelSocket`, then `connectDuels()`. Both attach the Supabase access token, and both are typed with `@loophole/shared`.

```mermaid
flowchart LR
    subgraph pages["app/ pages + components"]
        pLearn["/learn"]
        pLesson["/lessons/[id]"]
        pTutor["tutor-panel"]
        pBoard["/leaderboard"]
        pProfile["/profile"]
        pCert["/c/[slug] (public)"]
        pDuels["/duels"]
        pHeader["app-header"]
    end

    subgraph hooks["lib/queries (TanStack Query) + lib hooks"]
        hLessons["useCourses · useCoursePath · useLesson"]
        hSub["useSubmit · useSubmissions"]
        hAi["useExplain · useHint"]
        hBoard["useWeeklyLeaderboard · useRatingLeaderboard"]
        hMe["useMe · useUpdateMe"]
        hCert["useMyCertificates · usePublicCertificate"]
        hDuel["useDuelSocket (useReducer)"]
        hSession["useSession · useRequireSession"]
    end

    subgraph lib["lib/ clients"]
        apiFetch["api.ts · apiFetch()<br/>Bearer token, ApiError(code)"]
        socket["socket.ts · connectDuels()<br/>websocket only, fresh token per connect"]
        sb["supabase.ts<br/>sign-in, sign-out, session"]
    end

    shared[["@loophole/shared<br/>request, response and socket types"]]
    api[("NestJS API")]

    pLearn --> hLessons
    pLesson --> hLessons
    pLesson --> hSub
    pTutor --> hAi
    pBoard --> hBoard
    pProfile --> hMe
    pProfile --> hCert
    pCert --> hCert
    pHeader --> hMe
    pDuels --> hDuel
    pDuels --> hMe

    hLessons --> apiFetch
    hSub --> apiFetch
    hAi --> apiFetch
    hBoard --> apiFetch
    hMe --> apiFetch
    hCert --> apiFetch
    hDuel --> socket
    hSession --> sb
    apiFetch --> sb
    socket --> sb

    apiFetch -- "HTTPS REST" --> api
    socket -- "WSS /duels" --> api
    shared -.-> hooks
    shared -.-> lib
```
