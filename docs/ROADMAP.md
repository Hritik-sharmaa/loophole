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
- [x] HTML & CSS track: 15 lessons, live preview, pages checked by rules on the server (ADR-024)
- [x] JavaScript track: 20 lessons, Node 20 in Piston, `prompt()` for input (ADR-025)
- [ ] Re-test Node run times on the VPS (Docker Desktop stalls some Node starts past 3 s; ADR-025)
- [x] Git & GitHub track: 15 lessons in a simulated terminal and repository (ADR-026)
- [x] Language logos, a banner per course, new tagline (ADR-027)
- [x] The crew: four Indian guides, one per course; Byte becomes the logo (ADR-028)
- [x] Full-screen lessons with a fixed Continue bar and a finish screen (ADR-029)
- [x] Unit badges, cheat sheets and a certificate stop on the course page (ADR-030)
- [x] Spot-the-bug cards in every lesson, and a Bug hunt review per unit (ADR-031)
- [x] Playwright e2e for the PRD journeys J-1 to J-4 (ADR-034)
- [ ] Deploy step in GitHub Actions
- [ ] Scalability, only if needed: see `ARCHITECTURE.md` §5
- [ ] Stretch: replay (FR-27), bug of the day (FR-28), spectate (FR-29), JavaScript track (FR-30)

## Ideas backlog (developer approved, 2026-10-20)

Ideas from comparing Duolingo, Coddy and Codédex, kept here so none get lost. Build them one slice at a time, in this order unless the developer picks otherwise. Size: S under a day, M one or two slices, L larger.

**1. Finish what we started**

- [x] Spot-the-bug cards for every lesson after the first unit, so every unit has a Bug hunt (M, content)
- [x] Playwright e2e: sign in → lesson → finish screen (M, ADR-034)
- [ ] Re-test Node run times on the VPS (S, ADR-025)

**2. Bring learners back every day**

- [x] First-run welcome: pick a course and a daily goal (5 / 10 / 15 minutes); the guide says hello (M, ADR-033)
- [x] Daily goal ring in the header and a streak calendar on the profile (M, ADR-033)
- [x] Bug of the day: one buggy program a day for everyone, with a small board (M, FR-28, ADR-035)
- [x] Weekly leagues of ~20 learners with promotion and demotion (L, ADR-038; no weekly job: results are worked out when a learner joins)

**3. More ways to learn in a lesson**

- [x] Read aloud: a speaker button on guide bubbles, using the browser's speech (S, ADR-032)
- [x] "Explain it differently" on Learn cards, through the AI tutor and its daily cap (S–M, ADR-036)
- [x] Practice stop: mixes earlier quick checks and bug cards (spaced repetition) (M, ADR-037)
- [x] Hinglish mode for cards and guide lines (L, ADR-042): all four courses, 90 lessons

**4. Duels**

- [x] Practice duel against a guide bot when nobody is online (M, ADR-039)
- [x] JavaScript duel problems, with a language picker before every duel (M, ADR-040)
- [x] Duel replays (L, FR-27, ADR-041)

**5. Later**

- [ ] Small projects between units, like Codédex's checkpoint projects (L). Built for Python and JavaScript (ADR-043); HTML & CSS and Git next
- [ ] Learner avatars (M)
- [ ] Job-focused paths, e.g. "Frontend: HTML → CSS → JS → Git" (M)
