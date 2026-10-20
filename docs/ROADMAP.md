# Loophole — Roadmap

MVP first, in vertical slices (ADR-016). Each slice is one feature, backend route plus the page that uses it, and ends with something you can click through in the browser. Tick boxes as you go and update "Current milestone" in `AGENTS.md`.

Loop for every slice: AI **writes** the slice → you **review** and change it → **test** → you commit (ADR-014).

## Week 0 — before you start

- [ ] Install Node.js 24 LTS, pnpm, Docker Desktop, Git
- [ ] Create the GitHub repo `loophole`; add `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and `docs/`
- [ ] Create a Supabase project; note URL, anon key, service key, JWT secret
- [ ] Create a Gemini API key in Google AI Studio
- [ ] Draft the first 10 Python exercises

## Phase 1 — Working learning app

### M0 · Setup ✅

- [x] pnpm workspace: `apps/web`, `apps/api`, `packages/shared`
- [x] Empty Next.js app and NestJS app run together with `pnpm dev`
- [x] `infra/docker-compose.yml` runs Piston locally; Python runtime installed
- [x] `.env.example` in both apps; config validation in the API
- [x] ESLint in both apps (replace oxlint in the API), Prettier, TypeScript strict; GitHub Actions running lint + typecheck
- **Done when:** `pnpm dev` starts both apps and a request to local Piston prints "hello".

### S1 · Auth ✅

- [x] Login page (email + Google) with Supabase Auth; logout
- [x] `JwtAuthGuard` verifying Supabase tokens
- [x] `DbService` + Drizzle setup; `profiles` table, row created on first request
- [x] `GET /me`, `PATCH /me`; global `HttpExceptionFilter`
- **Done when:** you log in and see your profile on a page; `/me` returns 401 without a token. (FR-01, FR-02)

### S2 · Lessons ✅

- [x] Tables: courses, units, lessons, exercises, user_progress
- [x] Idempotent seed script for 10 exercises in `content/python/`
- [x] `GET /courses`, `GET /courses/:slug/path`, `GET /lessons/:id`
- [x] Plain path page (list of nodes) and exercise page (prompt, starter code, sample tests)
- [x] Test: no response ever contains `hiddenTests`
- **Done when:** the path shows locked / active nodes and a locked lesson returns 403. (FR-03, FR-04, FR-05, FR-16)

### S3 · Run and submit ✅

- [x] `PistonClient` with time and memory limits; runs one at a time (ADR-018)
- [x] `POST /submissions`; trimmed exact-match grading (unit-tested); next lesson unlocks
- [x] CodeMirror editor, Run button, results panel
- **Done when:** journey J-1 works: you solve exercise 1 in the browser and node 2 unlocks. (FR-06, FR-07, FR-08)

### S4 · XP, streak, leaderboard ✅

- [x] `xp_events` with a unique constraint; `SubmissionsService` calls `GamificationService` after the progress write
- [x] Daily streak (unit-tested); only a first lesson completion moves it; freezes come in Phase 3
- [x] Weekly XP leaderboard route and page
- **Done when:** a repeated completion pays once and the streak goes up on the next day. (FR-09, FR-10 basic, FR-11)

### S5 · AI tutor ✅

- [x] `GeminiClient`
- [x] `POST /ai/explain`, `POST /ai/hint`, daily cap in `ai_usage`
- [x] "Explain my error" and "Hint" buttons
- **Done when:** explanations are useful, hints never contain a full solution, and the 21st call returns 429. (FR-12, FR-13, FR-14)

### S6 · Deploy early ✅

- [x] VPS with Docker Compose: API + Piston + Caddy (AWS free plan, t3.small; `docs/DEPLOY.md` 2b)
- [x] Re-test parallel Piston runs on the VPS: 40/40 stable, ~50 ms per run; limit kept at 1 (ADR-018)
- [x] Web on Vercel with production env (<https://loophole-psi.vercel.app>)
- [x] Deploy files: API `Dockerfile`, `infra/docker-compose.prod.yml`, `Caddyfile`, runtime install script; runbook in `docs/DEPLOY.md`
- [x] README: what it is, how to run locally, demo link
- **Gate 1 — done when:** a friend on another network signs up and finishes a lesson.

## Phase 2 — Live debugging duels

### S7 · Duel rooms ✅

- [x] Tables: duel_problems, duels, duel_submissions; 15 problems seeded
- [x] `DuelsGateway` on `/duels` with JWT check on connect
- [x] In-memory `MatchmakingService` (first two in queue)
- [x] `canTransition(from, to)` with a test for each legal and illegal transition
- [x] Duel room page: problem, editor, countdown from `endsAt`, opponent progress bar
- [x] Winner via conditional update; server timer for timeout and draw
- **Done when:** two browsers are matched, race, and see the same single result. (FR-17, FR-19 to FR-22, FR-25, FR-26)

### S8 · Ratings ✅

- [x] `RatingsService`: ELO (K = 32) for both players in one transaction, unit-tested
- [x] Rating leaderboard
- **Gate 2 — done when:** both ratings update after every duel. (FR-24)

## Phase 3 — Polish and later (pick one at a time)

- [x] Hand-built SVG lesson path; pressable buttons, unlock pop, confetti, XP count-up, reduced-motion support
- [x] Profile page with XP, streak, rating, lessons done
- [x] Python track complete: 40 exercises in 7 units (G-1)
- [x] Streak freezes (full FR-10 rules, ADR-019)
- [x] Certificates and public `/c/:slug` page (FR-15)
- [x] Rating-band matchmaking (FR-18)
- [x] Disconnect forfeit after 30 s; reconnect resumes (FR-23)
- [x] Throttles on every route (120/min per user; writes and AI 10/min) and socket event
- [x] Script running two socket clients through 50 duels (`pnpm --filter @loophole/api soak:duels`, apps/api/README)
- [x] "Sticker Lab" redesign, Byte the mascot, logo (ADR-020)
- [x] Learn step before every exercise: cards, runnable examples (`POST /runs`), quick check; written for all 40 Python lessons (ADR-021)
- [x] Responsive pass (phone tab bar) and installable PWA (ADR-022)
- [x] Course catalog at `/learn`, one path per course at `/learn/[slug]` (ADR-023, FR-31)
- [ ] New tracks, in order: HTML & CSS (new checker + live preview), JavaScript (Piston Node), Git & GitHub (simulated repo)
- [ ] Playwright e2e for J-1 and J-3; deploy step in GitHub Actions
- [ ] Scalability, only if needed: see `ARCHITECTURE.md` §5
- [ ] Stretch: replay (FR-27), bug of the day (FR-28), spectate (FR-29), JavaScript track (FR-30)
