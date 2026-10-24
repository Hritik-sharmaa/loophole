# Loophole — Architecture Diagrams

Diagrams of the system as it is built today: Phases 1 and 2 done, Phase 3 features through ADR-053. The rules live in `docs/ARCHITECTURE.md`; these pictures follow the code in `apps/` and `infra/`. Everything is black on white.

**Pictures (hand-drawn style)**

- [`system-design.svg`](system-design.svg): the whole system on one page.
- [`api-lld.svg`](api-lld.svg): every API controller, service and rule file.
- [`architecture.excalidraw`](architecture.excalidraw): the source of both. Open it at <https://excalidraw.com> or with the VS Code Excalidraw extension to edit, then export each half as SVG.

![Loophole system design](system-design.svg)

**High-level design (HLD)**

1. System and deployment
2. Backend modules and layers
3. Flow: submit an exercise
4. Flow: live duel
5. Flow: practice duel against a bot
6. Data model

**Low-level design (LLD)**

7. Classes: learning (lessons, submissions, runs, git, AI, XP, leagues, certificates, Bug of the day)
8. Classes: duels (live, history, bots)
9. Pure rule functions and who calls them
10. State: duel lifecycle (server)
11. State: duel room (client)
12. State: lesson unlocks
13. Flow: the streak rule
14. Frontend layers

## 1. System and deployment

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "secondaryColor": "#ffffff", "tertiaryColor": "#ffffff", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "clusterBkg": "#ffffff", "clusterBorder": "#000000", "edgeLabelBackground": "#ffffff", "titleColor": "#000000"}}}%%
flowchart TB
    learner([Learner in a browser or the installed PWA])

    subgraph vercel["Vercel · apps/web (Next.js 16 App Router, React 19)"]
        pages["Pages (app/)<br/>/ · /login · /welcome · /learn · /learn/[slug]<br/>/learn/[slug]/practice · /learn/[slug]/bug-hunt/[unitId]<br/>/lessons/[id] · /duels · /duels/bot/[id] · /duels/replay/[id]<br/>/bug-of-the-day · /leaderboard · /profile · /profile/avatar · /c/[slug]"]
        ui["Components<br/>CodeMirror editor · course map · tutor panel · duel room<br/>landing scenes (GSAP) · page motion (Framer Motion)"]
        data["Data<br/>TanStack Query hooks · zod forms"]
        libapi["lib/api.ts<br/>REST + Bearer JWT"]
        libsock["lib/socket.ts<br/>Socket.io /duels"]
        libsb["lib/supabase.ts<br/>sign-in only"]
        sw["public/sw.js<br/>offline pages"]
        pages --> ui --> data
        data --> libapi
        data --> libsock
    end

    subgraph vps["AWS VPS · Docker Compose (infra/docker-compose.prod.yml)"]
        caddy["Caddy 2<br/>:443 HTTPS · Let's Encrypt<br/>reverse_proxy → api:3001 (WebSockets too)"]
        subgraph apic["api container · NestJS 12 · Node 24"]
            api["16 REST controllers + the /duels gateway<br/>15 modules · services · DbService · 3 clients"]
        end
        piston["Piston container (privileged)<br/>127.0.0.1:2000 · internal network only<br/>Python 3.12 · Node 20 · no outbound network"]
    end

    subgraph supa["Supabase cloud"]
        pg[("Postgres · 19 tables<br/>Drizzle migrations")]
        sbauth["Supabase Auth<br/>email + Google sign-in · issues JWTs"]
    end

    gemini["Google Gemini API<br/>explain · hint · explain a card"]
    shared["packages/shared<br/>TS types for REST + socket payloads"]
    content["content/*.json<br/>4 courses · 90 lessons · 18 projects<br/>30 duel problems · English + Hinglish"]
    ci["GitHub Actions CI<br/>format · lint · typecheck · unit<br/>API e2e (PGlite) · Playwright"]

    learner --> pages
    libapi -- "HTTPS REST" --> caddy
    libsock -- "WSS" --> caddy
    libsb -- "sign-in / session (anon key)" --> sbauth
    caddy --> api
    api -- "HTTP: run code" --> piston
    api -- "SQL (postgres.js pool)" --> pg
    api -- "verify JWT" --> sbauth
    api -- "@google/genai" --> gemini
    content -. "db:seed (idempotent)" .-> pg
    shared -. "imported by" .-> vercel
    shared -. "imported by" .-> apic
```

Why it looks like this:

- The browser only talks to Supabase Auth to sign in. Every other call goes through the API, so hidden tests, duel solutions and API keys stay on the server.
- Piston needs a privileged container, so it runs on the same VPS as the API. Only the internal Docker network can reach it.
- Matchmaking, duel timers and the Piston run queue live in memory, so v1 runs exactly one API instance.
- HTML & CSS exercises are never run: the API parses and checks them (ADR-024). Git exercises run in a simulated terminal in the API (ADR-026). Only Python and JavaScript go to Piston.

## 2. Backend modules and layers

Controllers and the gateway only validate and delegate (ADR-015). Services hold the rules. Each outside system has exactly one client class.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "secondaryColor": "#ffffff", "tertiaryColor": "#ffffff", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "clusterBkg": "#ffffff", "clusterBorder": "#000000", "edgeLabelBackground": "#ffffff", "titleColor": "#000000"}}}%%
flowchart TB
    subgraph global["Global request pipeline (app.module.ts)"]
        direction LR
        guard["JwtAuthGuard<br/>@Public() skips"] --> throttle["HttpThrottlerGuard<br/>120 req/min per user"] --> pipe["ValidationPipe<br/>class-validator DTOs"] --> filter["HttpExceptionFilter<br/>{ error: { code, message } }"]
    end

    subgraph ctl["Controllers / Gateway"]
        cMe["UsersController<br/>GET · PATCH /me · GET /me/activity"]
        cCourses["CoursesController<br/>/courses · /:slug/path · /:slug/practice<br/>/:slug/units/:id/cheatsheet · /bug-hunt"]
        cLessons["LessonsController<br/>GET /lessons/:id"]
        cSub["SubmissionsController<br/>POST · GET /submissions"]
        cRuns["RunsController<br/>POST /runs"]
        cGit["GitController<br/>POST /git/run"]
        cAi["AiController<br/>/ai/explain · /ai/hint · /ai/explain-card"]
        cWeekly["LeaderboardController<br/>GET /leaderboard/weekly"]
        cLeague["LeaguesController<br/>GET /leagues/current"]
        cRating["RatingsController<br/>GET /leaderboard/rating"]
        cCert["CertificatesController<br/>GET /certificates · /:slug (public)"]
        cDaily["DailyBugController<br/>/bug-of-the-day · /board · /submissions"]
        cHist["DuelsController<br/>/duels/history · /duels/:id/replay"]
        cBots["BotDuelsController<br/>/bot-duels · /:id · /submissions · /forfeit"]
        cHealth["HealthController<br/>GET /health (public)"]
        gDuels["DuelsGateway (Socket.io /duels)<br/>queue:join · queue:leave<br/>duel:submit · duel:forfeit"]
    end

    subgraph svc["Services (business rules + Drizzle queries)"]
        sUsers["UsersService"]
        sLessons["LessonsService<br/>unlocks · Hinglish"]
        sSub["SubmissionsService<br/>code · pages · git"]
        sRuns["RunsService"]
        sGit["GitService"]
        sAi["AiService<br/>daily cap"]
        sGam["GamificationService<br/>XP · streaks"]
        sLeague["LeaguesService"]
        sRat["RatingsService<br/>Elo"]
        sCert["CertificatesService"]
        sDaily["DailyBugService"]
        sHist["DuelHistoryService"]
        sBots["BotDuelsService"]
        sDuels["DuelsService<br/>timers"]
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
    cRuns --> sRuns
    cGit --> sGit
    cAi --> sAi
    cWeekly --> sGam
    cLeague --> sLeague
    cRating --> sRat
    cCert --> sCert
    cDaily --> sDaily
    cHist --> sHist
    cBots --> sBots
    cHealth --> sHealth
    gDuels --> sDuels

    sUsers --> sGam
    sUsers --> sRat
    sSub --> sLessons
    sSub --> sUsers
    sSub --> sGam
    sSub --> sCert
    sRuns --> sLessons
    sGit --> sLessons
    sAi --> sLessons
    sAi --> sUsers
    sGam --> sLeague
    sDaily --> sUsers
    sDaily --> sGam
    sBots --> sUsers
    sDuels --> sMatch
    sDuels --> sUsers
    sDuels --> sRat

    sSub --> piston
    sRuns --> piston
    sDaily --> piston
    sBots --> piston
    sDuels --> piston
    sHealth --> piston
    sAi --> gem
    guard --> sba
    gDuels --> sba
    svc --> db
```

## 3. Flow: submit an exercise

`exerciseKind(language)` picks the grader: Python and JavaScript run in Piston, HTML & CSS pages are parsed and checked, Git commands run in a simulated repository.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "actorBkg": "#ffffff", "actorBorder": "#000000", "actorTextColor": "#000000", "actorLineColor": "#000000", "signalColor": "#000000", "signalTextColor": "#000000", "labelBoxBkgColor": "#ffffff", "labelBoxBorderColor": "#000000", "labelTextColor": "#000000", "loopTextColor": "#000000", "noteBkgColor": "#ffffff", "noteBorderColor": "#000000", "noteTextColor": "#000000", "activationBkgColor": "#ffffff", "activationBorderColor": "#000000", "sequenceNumberColor": "#ffffff", "altBackground": "#ffffff"}}}%%
sequenceDiagram
    autonumber
    actor L as Learner
    participant W as Next.js (lesson page)
    participant A as API · SubmissionsController
    participant S as SubmissionsService
    participant P as PistonClient → Piston
    participant G as GamificationService
    participant C as CertificatesService
    participant DB as Postgres

    L->>W: Click "Submit"
    W->>A: POST /submissions { exerciseId, code } + Bearer JWT
    A->>A: JwtAuthGuard → userId · throttle · DTO validation
    A->>S: submit(user, dto)
    S->>DB: load exercise (with hidden tests) + check lesson unlocked
    alt lesson locked
        S-->>W: 403 LESSON_LOCKED
    end
    alt Python or JavaScript
        loop each sample + hidden test, one at a time (ADR-018)
            S->>P: run(language, code + prompt() helper, stdin)
            P-->>S: stdout / stderr / time-out
            Note over S: compare trimmed stdout (ADR-011)<br/>after a time-out, skip the rest
        end
    else HTML & CSS
        S->>S: checkPage(): parse with htmlparser2 + postcss, run the checks
    else Git
        S->>S: replay the commands in git-sim, run the git checks
    end
    S->>DB: insert submissions row
    opt all passed and lesson not yet complete
        S->>DB: mark user_progress complete
        S->>G: awardLesson: +10 XP (+30 for a project) once, streak, league
        G->>DB: insert xp_events (unique user + source + sourceId)
        S->>C: issueIfComplete: last lesson of a course?
        C->>DB: insert certificates (public slug)
    end
    S-->>A: { status, testsPassed, totalTests, results }
    A-->>W: 201 with sample-test details only (never hidden_tests)
    W-->>L: Results, XP, finish screen
```

## 4. Flow: live duel

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "actorBkg": "#ffffff", "actorBorder": "#000000", "actorTextColor": "#000000", "actorLineColor": "#000000", "signalColor": "#000000", "signalTextColor": "#000000", "labelBoxBkgColor": "#ffffff", "labelBoxBorderColor": "#000000", "labelTextColor": "#000000", "loopTextColor": "#000000", "noteBkgColor": "#ffffff", "noteBorderColor": "#000000", "noteTextColor": "#000000", "activationBkgColor": "#ffffff", "activationBorderColor": "#000000", "sequenceNumberColor": "#ffffff", "altBackground": "#ffffff"}}}%%
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
    P1->>GW: queue:join { language: python | javascript }
    GW->>DS: joinQueue(userId, socketId, language)
    DS->>MM: join (same-language line only, ADR-040)
    DS-->>P1: queue:joined { position }
    P2->>GW: connect + queue:join { same language }
    DS->>MM: takePair: rating band 150, +100 every 15 s
    DS->>DB: insert duels (matched), pick a duel_problem in that language
    DS-->>P1: duel:matched + duel:start { buggyCode, sampleTests, endsAt }
    DS-->>P2: duel:matched + duel:start
    Note over DS: status → in_progress · timer armed at endsAt (5 min)<br/>both sockets join room duel:ID

    P1->>GW: duel:submit { duelId, code }
    GW->>DS: submit (1 every 3 s per player)
    DS->>PC: run each test
    PC-->>DS: outputs
    DS->>DB: insert duel_submissions
    DS-->>P1: duel:result (own details)
    DS-->>P2: duel:progress { passed / total }

    alt fully passing submission
        DS->>DB: BEGIN · update duels set winner_id, status='completed'<br/>where id=$id and winner_id is null
        DS->>RS: applyDuel (rows locked in id order, same tx)
        RS->>DB: update ratings · COMMIT
        DS-->>P1: duel:end { result, winnerId, ratingChange }
        DS-->>P2: duel:end
    else timer reaches endsAt
        DS->>DB: finish by most tests passed, or draw (+ Elo, same tx)
        DS-->>P1: duel:end
        DS-->>P2: duel:end
    else player forfeits, or their last tab is gone for 30 s
        DS->>DB: forfeit result (+ Elo, same tx)
        DS-->>P2: duel:opponent · duel:end
    end
    Note over DS: On API start, timers are re-armed for duels still in_progress.<br/>Afterwards GET /duels/:id/replay rebuilds the race from duel_submissions<br/>(the learner's own code only, the rival's code never leaves).
```

## 5. Flow: practice duel against a bot

No socket and no second player (ADR-039): the bot's whole race is decided when the duel starts, and every read checks the clock against it.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "actorBkg": "#ffffff", "actorBorder": "#000000", "actorTextColor": "#000000", "actorLineColor": "#000000", "signalColor": "#000000", "signalTextColor": "#000000", "labelBoxBkgColor": "#ffffff", "labelBoxBorderColor": "#000000", "labelTextColor": "#000000", "loopTextColor": "#000000", "noteBkgColor": "#ffffff", "noteBorderColor": "#000000", "noteTextColor": "#000000", "activationBkgColor": "#ffffff", "activationBorderColor": "#000000", "sequenceNumberColor": "#ffffff", "altBackground": "#ffffff"}}}%%
sequenceDiagram
    autonumber
    actor L as Learner
    participant W as /duels/bot/[id]
    participant B as BotDuelsService
    participant P as PistonClient → Piston
    participant DB as Postgres

    L->>W: Race Meera (easy) / Arjun / Harpreet
    W->>B: POST /bot-duels { opponent, language }
    B->>DB: insert bot_duels: problem, endsAt, botSchedule()<br/>(when the bot passes each test)
    B-->>W: duel with its botSchedule
    Note over W: the page draws the bot's progress from the schedule and the clock
    loop until someone finishes
        L->>W: Submit fix
        W->>B: POST /bot-duels/:id/submissions
        B->>P: run sample + hidden tests
        B->>DB: full pass before the bot's finish → won<br/>(conditional update: the result is set once)
    end
    opt the bot's finish passes first
        W->>B: GET /bot-duels/:id
        B->>DB: mark the race lost, dated at the bot's finish
    end
```

## 6. Data model

`auth.users` belongs to Supabase. Every user-owned table hangs off `profiles` with `on delete cascade`.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "attributeBackgroundColorOdd": "#ffffff", "attributeBackgroundColorEven": "#ffffff"}}}%%
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
    PROFILES ||--o{ CERTIFICATES : earns
    COURSES ||--o{ CERTIFICATES : "certifies"
    LEAGUE_GROUPS ||--o{ LEAGUE_MEMBERS : has
    PROFILES ||--o{ LEAGUE_MEMBERS : "one per week"
    DUEL_PROBLEMS ||--o{ DUELS : "used in"
    PROFILES ||--o{ DUELS : "player_a / player_b / winner"
    DUELS ||--o{ DUEL_SUBMISSIONS : has
    PROFILES ||--o{ DUEL_SUBMISSIONS : makes
    DUEL_PROBLEMS ||--o{ BOT_DUELS : "used in"
    PROFILES ||--o{ BOT_DUELS : races
    DUEL_PROBLEMS ||--o{ DAILY_BUG_PLAYS : "bug of the day"
    PROFILES ||--o{ DAILY_BUG_PLAYS : "one per day"

    PROFILES {
        uuid id PK "= auth.users.id"
        text username UK
        text avatar "avatar maker code (ADR-046)"
        smallint daily_goal "XP a day"
        text lesson_language "en | hinglish"
    }
    COURSES {
        uuid id PK
        text slug UK
        text language "python | javascript | html | git"
        text title
        text description
    }
    UNITS {
        uuid id PK
        uuid course_id FK
        text slug
        text title
        int position
    }
    LESSONS {
        uuid id PK
        uuid unit_id FK
        text slug
        text title
        int position
        jsonb learn "cards, quick check, bug cards; + Hinglish"
        boolean is_project
    }
    EXERCISES {
        uuid id PK
        uuid lesson_id FK, UK
        text prompt
        text prompt_hi
        text starter_code
        jsonb sample_tests
        jsonb hidden_tests "never sent to client"
        jsonb checks "HTML & CSS rules"
        jsonb git_scenario "Git exercises"
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
        text code
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
        int count "max 20"
    }
    RATINGS {
        uuid user_id PK, FK
        int elo "default 1200"
        int wins
        int losses
        int draws
    }
    CERTIFICATES {
        uuid id PK
        uuid user_id FK
        uuid course_id FK
        text public_slug UK
        timestamptz issued_at
    }
    LEAGUE_GROUPS {
        uuid id PK
        date week_start
        smallint tier "Bronze to Diamond"
    }
    LEAGUE_MEMBERS {
        date week_start PK
        uuid user_id PK, FK
        uuid group_id FK
    }
    DUEL_PROBLEMS {
        uuid id PK
        text slug UK
        text language
        text title
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
        text code
        int tests_passed
        int total_tests
    }
    BOT_DUELS {
        uuid id PK
        uuid user_id FK
        uuid problem_id FK
        text opponent "meera | arjun | harpreet"
        jsonb bot_schedule
        text result "set once"
        timestamptz ends_at
    }
    DAILY_BUG_PLAYS {
        uuid id PK
        uuid user_id FK
        date day "IST"
        uuid problem_id FK
        timestamptz opened_at
        timestamptz solved_at
        int attempts
    }
```

---

# Low-level design

![Loophole API low-level design](api-lld.svg)

The LLD follows the plain-NestJS rules in `docs/ARCHITECTURE.md` §2 (ADR-015):

- Controllers and the gateway are thin.
- Services own the rules and the Drizzle queries.
- The rules that are easy to get wrong live in pure functions with no I/O, so they can be unit-tested.
- Each outside system sits behind exactly one client class.
- Dependency injection is by class. There are no interfaces or tokens.

## 7. Classes: learning

Every service also depends on `DbService`. Those arrows are left out to keep the picture readable.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "classText": "#000000"}}}%%
classDiagram
    direction TB

    class LessonsService {
        <<service>>
        +listCourses() CourseOverview[]
        +getPath(userId, slug) CoursePath
        +getLesson(userId, lessonId) LessonDetail
        +getPractice(userId, slug) PracticeSet
        +getCheatSheet(userId, slug, unitId) UnitCheatSheet
        +getBugHunt(userId, slug, unitId) UnitBugHunt
        +assertUnlocked(userId, lessonId, courseId) void
        +lessonLanguage(userId) en or hinglish
    }
    class SubmissionsService {
        <<service>>
        +submit(user, dto) SubmissionResult
        +list(userId, exerciseId) SubmissionSummary[]
    }
    class RunsService {
        <<service>>
        +run(user, dto) RunResult
    }
    class GitService {
        <<service>>
        +run(user, dto) GitRunResult
    }
    class AiService {
        <<service>>
        +explain(user, dto) ExplainResponse
        +hint(user, dto) HintResponse
        +explainCard(user, dto) ExplainCardResponse
        -withDailyCap(userId, fn)
    }
    class GamificationService {
        <<service>>
        +awardLesson(userId, lessonId) xpAwarded
        +awardDailyBug(userId, playId) xpAwarded
        +stats(userId) xpAndStreak
        +activity(userId) days
        +weekly(userId, limit) WeeklyLeaderboard
    }
    class LeaguesService {
        <<service>>
        +join(userId) void
        +current(userId) LeagueView
    }
    class CertificatesService {
        <<service>>
        +issueIfComplete(userId, lessonId) slugOrNull
        +listMine(userId) CertificateSummary[]
        +getPublic(slug) PublicCertificate
    }
    class DailyBugService {
        <<service>>
        +today(user) DailyBugToday
        +board(userId) DailyBugBoard
        +submit(user, dto) DailyBugResult
    }
    class UsersService {
        <<service>>
        +getMe(user) MeResponse
        +updateMe(user, dto) MeResponse
        +activity(userId) days
        +ensureProfile(user) void
    }
    class RatingsService {
        <<service>>
        +elosOf(userIds) Map
    }
    class PistonClient {
        <<client>>
        -queue Promise
        +isUp() boolean
        +run(language, code, stdin) RunResult
    }
    class GeminiClient {
        <<client>>
        +explainError(input) explanationAndLine
        +giveHint(input) hint
        +explainCard(input) text
    }

    SubmissionsService --> LessonsService : assertUnlocked
    SubmissionsService --> UsersService : ensureProfile
    SubmissionsService --> GamificationService : awardLesson
    SubmissionsService --> CertificatesService : issueIfComplete
    SubmissionsService --> PistonClient : runTests
    RunsService --> LessonsService : languageOf
    RunsService --> PistonClient : run
    GitService --> LessonsService : gitLessonOf
    AiService --> LessonsService : assertUnlocked
    AiService --> UsersService : ensureProfile
    AiService --> GeminiClient
    GamificationService --> LeaguesService : join on first XP of the week
    DailyBugService --> UsersService : ensureProfile
    DailyBugService --> GamificationService : awardDailyBug
    DailyBugService --> PistonClient : runTests
    UsersService --> GamificationService : stats
    UsersService --> RatingsService : elosOf
```

## 8. Classes: duels

Socket events reach `DuelsGateway`, and it hands each one to `DuelsService`. `DuelsService` owns all live duel state: timers, absent-player timers and the per-user rate limit. Replays and bot duels are plain HTTP.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "classText": "#000000"}}}%%
classDiagram
    direction TB

    class DuelsGateway {
        <<gateway>>
        +afterInit(io) void
        +handleConnection(socket) void
        +handleDisconnect(socket) void
        +joinQueue(socket, dto) void
        +leaveQueue(socket) void
        +submit(socket, dto) void
        +forfeit(socket, dto) void
    }
    class DuelsService {
        <<service>>
        -io Namespace
        -timers Map
        -absentTimers Map
        -lastSubmitAt Map
        -actions RateLimiter
        +attach(io) void
        +onApplicationBootstrap() void
        +connect(socket, user) void
        +disconnect(socketId, userId) void
        +joinQueue(userId, socketId, language) void
        +leaveQueue(userId) void
        +submit(userId, dto) void
        +forfeit(userId, duelId) void
        +forfeitIfAbsent(userId) void
        +finishOnTimeout(duelId) void
    }
    class MatchmakingService {
        <<in memory>>
        -queue WaitingPlayer[]
        +join(userId, socketId, elo, now, language) number
        +leave(userId) void
        +leaveSocket(socketId) void
        +takePair(now) pairOrNull
    }
    class DuelHistoryService {
        <<service>>
        +history(userId) DuelHistoryEntry[]
        +replay(userId, duelId) DuelReplay
    }
    class BotDuelsService {
        <<service>>
        +start(user, dto) BotDuel
        +get(userId, id) BotDuel
        +submit(user, id, dto) BotDuelSubmitResult
        +forfeit(userId, id) BotDuel
    }
    class RatingsService {
        <<service>>
        +applyDuel(tx, playerA, playerB, scoreA) ratingChange
        +elosOf(userIds) Map
        +leaderboard(userId, limit) RatingLeaderboard
    }
    class UsersService {
        <<service>>
        +ensureProfile(user) void
    }
    class SupabaseAuthClient {
        <<client>>
        +verify(token) AuthUser
    }
    class PistonClient {
        <<client>>
        +run(language, code, stdin) RunResult
    }
    class RateLimiter {
        <<common>>
        +hit(key, now) boolean
    }

    DuelsGateway --> SupabaseAuthClient : verify JWT on connect
    DuelsGateway --> DuelsService
    DuelsService --> MatchmakingService : join, leave, takePair
    DuelsService --> RatingsService : elosOf, applyDuel in the same tx
    DuelsService --> UsersService : ensureProfile
    DuelsService --> PistonClient : runTests
    DuelsService *-- RateLimiter : 20 actions per min
    BotDuelsService --> UsersService : ensureProfile
    BotDuelsService --> PistonClient : runTests
```

Notes on `DuelsService` state:

- `timers`: one per running duel (duelId to timeout). Its size is the active-duel count, capped at 20.
- `absentTimers`: one per player whose last tab closed (userId to timeout). It fires the 30 s forfeit.
- `lastSubmitAt`: enforces one `duel:submit` every 3 s per player.
- `onApplicationBootstrap()`: re-arms timers for duels still `in_progress`.

## 9. Pure rule functions and who calls them

These files do no I/O. They hold the logic AGENTS.md rule 6 says to test: grading, streaks, Elo and the duel winner, and the newer rules for leagues, bots, Bug of the day and Git. Each has a spec in `__tests__/`.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "secondaryColor": "#ffffff", "tertiaryColor": "#ffffff", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "clusterBkg": "#ffffff", "clusterBorder": "#000000", "edgeLabelBackground": "#ffffff", "titleColor": "#000000"}}}%%
flowchart LR
    subgraph services["Services"]
        sUsers[UsersService]
        sLessons[LessonsService]
        sSub[SubmissionsService]
        sRuns[RunsService]
        sGit[GitService]
        sAi[AiService]
        sGam[GamificationService]
        sLeague[LeaguesService]
        sRat[RatingsService]
        sDuels[DuelsService]
        sMatch[MatchmakingService]
        sHist[DuelHistoryService]
        sBots[BotDuelsService]
        sDaily[DailyBugService]
    end

    subgraph rules["Pure functions (no I/O, unit-tested)"]
        username["users/username.ts<br/>toUsernameBase() · withRandomSuffix()"]
        lstates["lessons/lesson-states.ts<br/>lessonStates(): locked · active · completed<br/>projects never hold back the next unit"]
        corder["lessons/course-order.ts · practice.ts<br/>orderCourses() · pickPractice()"]
        text["common/lesson-text.ts<br/>localizeLearn() · localizePrompt()<br/>English or Hinglish (ADR-042)"]
        runtests["submissions/run-tests.ts<br/>runTests(): one at a time, stop after a time-out"]
        grading["submissions/grading.ts<br/>grade() · outputMatches()"]
        web["submissions/web-checks.ts<br/>checkPage() · gradeChecks()"]
        helpers["common/program-helpers.ts<br/>withProgramHelpers(): prompt() for JS"]
        git["git/git-sim.ts · git-checks.ts<br/>runCommands() · gradeGit()"]
        guards["ai/tutor-guards.ts<br/>limitWords(120) · containsCodeBlock()"]
        streak["gamification/streak.ts<br/>nextStreak() · 1 freeze per 7 days, max 2"]
        ist["common/ist-calendar.ts<br/>istDate() · istWeekStart()"]
        league["leagues/league-rules.ts<br/>rankStandings() · zoneOf() · nextTier()"]
        elo["ratings/elo.ts<br/>eloChanges() · K = 32, start 1200"]
        drules["duels/duel-rules.ts<br/>canTransition() · timeoutOutcome()"]
        band["matchmaking.service.ts<br/>ratingBand(): 150, +100 every 15 s"]
        replay["duels/duel-replay.ts<br/>replayEvents() · outcomeFor()"]
        bot["bot-duels/bot-duel-rules.ts<br/>botSchedule() · botFinishAt()"]
        daily["daily-bug/daily-bug-rules.ts<br/>dailyPick() · rankSolves()"]
        avatars["common/avatars.ts<br/>avatarOf() · isAvatarCode()"]
    end

    sUsers --> username
    sUsers --> avatars
    sLessons --> lstates
    sLessons --> corder
    sLessons --> text
    sSub --> runtests --> grading
    sSub --> web
    sSub --> git
    sRuns --> helpers
    runtests --> helpers
    sGit --> git
    sAi --> guards
    sAi --> ist
    sGam --> streak --> ist
    sLeague --> league
    sRat --> elo
    sDuels --> drules
    sDuels --> runtests
    sMatch --> band
    sHist --> replay
    sBots --> bot
    sBots --> runtests
    sDaily --> daily
    sDaily --> runtests
```

## 10. State: duel lifecycle (server)

`duel-rules.ts` allows only these steps. `assertTransition` throws `409 ILLEGAL_TRANSITION` on any other step. `waiting` exists only in memory (the matchmaking queue). The other states are `duels.status` in Postgres.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "stateBkg": "#ffffff", "stateBorder": "#000000", "transitionColor": "#000000", "noteBkgColor": "#ffffff", "noteBorderColor": "#000000", "noteTextColor": "#000000", "specialStateColor": "#000000", "innerEndBackground": "#000000", "compositeBackground": "#ffffff", "altBackground": "#ffffff"}}}%%
stateDiagram-v2
    [*] --> waiting : player joins a language's queue
    waiting --> [*] : leaves the queue or disconnects
    waiting --> matched : takePair() finds a rival in the rating band, duels row inserted
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

## 11. State: duel room (client)

The `/duels` page keeps the duel in a `useReducer` (`apps/web/lib/use-duel-socket.ts`). Server events drive every transition. The client never decides the result.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "stateBkg": "#ffffff", "stateBorder": "#000000", "transitionColor": "#000000", "noteBkgColor": "#ffffff", "noteBorderColor": "#000000", "noteTextColor": "#000000", "specialStateColor": "#000000", "innerEndBackground": "#000000", "compositeBackground": "#ffffff", "altBackground": "#ffffff"}}}%%
stateDiagram-v2
    [*] --> connecting
    connecting --> idle : socket connected
    connecting --> offline : connect error
    offline --> idle : reconnected
    idle --> queued : queue joined (position) after picking a language
    queued --> idle : left the queue, or an error while queued
    queued --> playing : duel start (after duel matched)
    idle --> playing : duel start for a resumed duel (reload or second tab)
    playing --> ended : duel end
    ended --> idle : find another duel

    note right of playing
        duel progress updates my score and theirs
        duel result shows my last run
        duel opponent starts the 30 s away countdown
        submitting is true while a submit is in flight
    end note
```

## 12. State: lesson unlocks

`lessonStates()` walks the course in path order. Completed lessons stay open, the first unfinished lesson is active, and every lesson after it is locked. A unit's project opens when the lesson before it is done but never holds back the next unit (ADR-043). `LessonsService.assertUnlocked` applies the same rule to submissions and AI calls, so a locked lesson is blocked on the server, not just hidden in the UI.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "stateBkg": "#ffffff", "stateBorder": "#000000", "transitionColor": "#000000", "specialStateColor": "#000000", "innerEndBackground": "#000000", "compositeBackground": "#ffffff", "altBackground": "#ffffff"}}}%%
stateDiagram-v2
    direction LR
    [*] --> locked
    locked --> active : previous lesson completed
    active --> completed : every sample and hidden test passes, +10 XP once (+30 for a project)
    completed --> completed : re-submits never pay again (xp_events unique)
```

## 13. Flow: the streak rule

`nextStreak(prev, today)` runs when a lesson is completed for the first time. Days are IST calendar days.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "edgeLabelBackground": "#ffffff"}}}%%
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

## 14. Frontend layers

Pages never call `fetch` or Socket.io directly. Data goes through TanStack Query hooks, then `apiFetch`. The duel room goes through `useDuelSocket`, then `connectDuels()`. Both attach the Supabase access token, and both are typed with `@loophole/shared`.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"background": "#ffffff", "primaryColor": "#ffffff", "primaryTextColor": "#000000", "primaryBorderColor": "#000000", "secondaryColor": "#ffffff", "tertiaryColor": "#ffffff", "lineColor": "#000000", "textColor": "#000000", "mainBkg": "#ffffff", "nodeBorder": "#000000", "clusterBkg": "#ffffff", "clusterBorder": "#000000", "edgeLabelBackground": "#ffffff", "titleColor": "#000000"}}}%%
flowchart LR
    subgraph pages["app/ pages + components"]
        pLearn["/learn · /learn/[slug]<br/>practice · bug hunt"]
        pLesson["/lessons/[id]<br/>tutor panel · terminal · preview"]
        pDaily["/bug-of-the-day"]
        pDuels["/duels · /duels/bot/[id]<br/>/duels/replay/[id]"]
        pBoard["/leaderboard"]
        pProfile["/profile · /profile/avatar<br/>/welcome · app header"]
        pCert["/c/[slug] (public)"]
    end

    subgraph hooks["lib/queries (TanStack Query) + lib hooks"]
        hLessons["useCourses · useCoursePath · useLesson<br/>useCheatSheet · useBugHunt · usePractice"]
        hSub["useSubmit · useSubmissions<br/>useRun · useGitRun"]
        hAi["useExplain · useHint · useExplainCard"]
        hDaily["useDailyBug · useDailyBugBoard<br/>useSubmitDailyBug"]
        hDuel["useDuelSocket (useReducer)<br/>useBotDuel · useDuelHistory · useDuelReplay"]
        hBoard["useWeeklyLeaderboard · useLeague<br/>useRatingLeaderboard"]
        hMe["useMe · useUpdateMe · useActivity"]
        hCert["useMyCertificates · usePublicCertificate"]
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
    pLesson --> hAi
    pDaily --> hDaily
    pDuels --> hDuel
    pBoard --> hBoard
    pProfile --> hMe
    pProfile --> hCert
    pCert --> hCert

    hLessons --> apiFetch
    hSub --> apiFetch
    hAi --> apiFetch
    hDaily --> apiFetch
    hBoard --> apiFetch
    hMe --> apiFetch
    hCert --> apiFetch
    hDuel --> apiFetch
    hDuel --> socket
    hSession --> sb
    apiFetch --> sb
    socket --> sb

    apiFetch -- "HTTPS REST" --> api
    socket -- "WSS /duels" --> api
    shared -.-> hooks
    shared -.-> lib
```
