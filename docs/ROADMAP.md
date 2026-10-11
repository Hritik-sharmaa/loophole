# Loophole — Roadmap

Twelve milestones, about 10–12 hours a week. Tick boxes as you go and update "Current milestone" in `AGENTS.md`. A phase starts only after the gate before it passes.

Each milestone follows the same loop: **learn** the concept → **sketch** it on Excalidraw → **explain** each class's one job → AI **writes** it in small pieces → you **review** and change it → **test** (ADR-014).

## Week 0 — before you start

- [ ] Install Node.js 24 LTS, pnpm, Docker Desktop, Git
- [ ] Create the GitHub repo `loophole`; add `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and `docs/`
- [ ] Create a Supabase project; note URL, anon key, service key, JWT secret
- [ ] Create a Gemini API key in Google AI Studio
- [ ] Put the architecture diagram on an Excalidraw board
- [ ] Draft the first 10 Python exercises

## Phase 1 — Core learning platform (weeks 1–8)

### M0 · Setup (week 1)
Learn: HLD vs LLD, the four layers, monorepos.
- [ ] pnpm workspace: `apps/web`, `apps/api`, `packages/shared`
- [ ] Empty Next.js app and NestJS app run together with `pnpm dev`
- [ ] `infra/docker-compose.yml` runs Piston locally; Python runtime installed
- [ ] `.env.example` in both apps; config validation in the API
- [ ] ESLint in both apps (replace oxlint in the API), Prettier, TypeScript strict; GitHub Actions running lint + typecheck
- **Done when:** `pnpm dev` starts both apps and a request to local Piston prints "hello".

### M1 · Domain and fakes (week 2)
Learn: interfaces, dependency inversion, SOLID, DI tokens, unit tests with fakes.
- [ ] `Submission` entity
- [ ] `ICodeExecutor`, `ISubmissionRepository`, `IExerciseRepository` with Symbol tokens
- [ ] `FakeCodeExecutor`, in-memory repositories
- [ ] `SubmissionsService.submit` with Vitest tests
- **Done when:** tests prove pass, fail and "already completed" paths with no network or database.

### M2 · Auth (week 3)
Learn: JWTs, NestJS guards, Supabase Auth.
- [ ] Sign-up, login, logout pages (email + Google)
- [ ] `JwtAuthGuard` verifying Supabase tokens
- [ ] `profiles` table, created on first login
- [ ] `GET /me`, `PATCH /me`
- **Done when:** `/me` returns your profile with a token and 401 without one. (FR-01, FR-02)

### M3 · Lessons (week 4)
Learn: repository pattern with Drizzle, migrations, DTOs, seed scripts.
- [ ] Tables: courses, units, lessons, exercises, user_progress
- [ ] Idempotent seed loader for `content/python/`
- [ ] `GET /courses`, `GET /courses/:slug/path`, `GET /lessons/:id`
- [ ] Test: no response ever contains `hiddenTests`
- **Done when:** 10 seeded exercises are served and locked lessons return 403. (FR-03, FR-04, FR-05, FR-16)

### M4 · Code runs (week 5)
Learn: strategy and adapter patterns, timeouts, server-side grading.
- [ ] `PistonExecutor` with time and memory limits
- [ ] Drizzle repositories replace the in-memory ones (module bindings only)
- [ ] `POST /submissions`; trimmed exact-match grading
- [ ] Exercise page: CodeMirror editor, Run button, results panel
- **Done when:** you solve an exercise in the browser and the next lesson unlocks. (FR-06, FR-07, FR-08)

### M5 · XP and streaks (week 6)
Learn: observer pattern, domain events, idempotency.
- [ ] Emit `lesson.completed` after the progress write
- [ ] `XpListener` → `xp_events` (unique constraint)
- [ ] `StreakListener` with freeze rules, unit-tested
- [ ] Weekly leaderboard route and page
- **Done when:** a repeated completion pays once and a missed day spends a freeze. (FR-09, FR-10, FR-11)

### M6 · Gemini tutor (week 7)
Learn: adapters for third-party APIs, prompt design, structured output, rate limits.
- [ ] `IAiTutor`, `GeminiTutor`, `FakeAiTutor`
- [ ] `POST /ai/explain`, `POST /ai/hint`, daily cap in `ai_usage`
- [ ] "Explain my error" and "Hint" buttons
- **Done when:** explanations are useful, hints never contain a full solution, the 21st call returns 429. (FR-12, FR-13, FR-14)

### M7 · Lesson path and polish (week 8)
Learn: SVG layout, Framer Motion springs, Tailwind tokens.
- [ ] Hand-built SVG lesson path
- [ ] Pressable buttons, unlock pop, confetti, XP count-up, reduced-motion support
- [ ] Profile page with XP, streak, lessons done
- [ ] Python track complete: 40 exercises
- **Gate 1 — done when:** a fresh account finishes the whole track on desktop and mobile.

## Phase 2 — Live debugging duels (weeks 9–11)

### M8 · Duel rooms (weeks 9–10)
Learn: WebSockets, state pattern, race conditions, server authority.
- [ ] Tables: duel_problems, duels, duel_submissions; 15 problems seeded
- [ ] `DuelsGateway` on `/duels` with JWT check on connect
- [ ] In-memory `MatchmakingService` (first two in queue)
- [ ] `DuelStateMachine` with tests for every legal and illegal transition
- [ ] Duel room page: problem, editor, countdown from `endsAt`, opponent progress bar
- [ ] Winner via conditional update; server timer for timeout and draw
- [ ] Sentry on API and web
- **Done when:** two browsers are matched, race, and see the same single result. (FR-17, FR-19 to FR-22, FR-25, FR-26)

### M9 · Ratings and hardening (week 11)
Learn: ELO, failure handling, basic load testing.
- [ ] `RatingListener` on `duel.finished` (K = 32), one transaction
- [ ] Rating leaderboard
- [ ] Disconnect forfeit after 30 s; reconnect resumes
- [ ] Rating-band matchmaking
- [ ] Throttles on every write route and socket event
- [ ] Script running two fake socket clients through 50 duels
- **Gate 2 — done when:** all 50 scripted duels end with exactly one result. (FR-18, FR-23, FR-24)

## Launch (week 12)

### M10 · Deploy and certificates
Learn: Docker Compose in production, reverse proxies, CI/CD.
- [ ] VPS (2 vCPU / 4 GB) with Docker Compose: API + Piston + Caddy
- [ ] Web on Vercel with production env
- [ ] GitHub Actions: lint, typecheck, tests, and a deploy step
- [ ] Certificates: issue on track completion; public `/c/:slug` page
- [ ] README: what it is, architecture diagram, how to run locally, demo link
- **Done when:** a friend on another network signs up, finishes a lesson and duels you. (FR-15)

## Phase 3 — Stretch (after launch)

### M11 · One at a time
- [ ] Replay a finished duel (FR-27)
- [ ] Daily bug-of-the-day bracket (FR-28)
- [ ] Spectate mode (FR-29)
- [ ] JavaScript track (FR-30)
