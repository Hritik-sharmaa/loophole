# Loophole — Product Requirements (PRD)

Version 1.0 · 2026-10-02 · Owner: Hritik

This is the source of truth for _what_ Loophole does. _How_ it is built lives in `ARCHITECTURE.md`. Every requirement has an ID; reference it in commits and PRs (`feat(lessons): FR-04 unlock next node`).

Priority: **Must** = v1 blocker · **Should** = v1 if time allows · **Could** = after launch.

## 1. Product summary

A Duolingo-style platform for learning to code, with live 1v1 debugging duels as its differentiator. Learners follow a lesson path, write real code in the browser, get graded in a sandbox, and earn XP, streaks and ratings. AI hints come from Google Gemini.

## 2. Goals

| ID  | Goal                              | Measured by                                                      |
| --- | --------------------------------- | ---------------------------------------------------------------- |
| G-1 | Working solo learning loop        | One full Python track (40 exercises) playable end to end         |
| G-2 | Working live duels                | Two users finish a duel with one correct, server-decided result  |
| G-3 | Learn by building                 | A working full-stack app first; deeper LLD patterns after launch |
| G-4 | Distinct, portfolio-grade product | Own visual identity; public demo and README                      |

## 3. Non-goals for v1

More than one language track · non-coding spaces · teacher portal · payments · native mobile apps · analytics dashboards.

## 4. Personas

| Persona              | Wants                                          | Key features                        |
| -------------------- | ---------------------------------------------- | ----------------------------------- |
| Beginner learner     | Short, hands-on practice with instant feedback | Lesson path, editor, AI hints       |
| Working developer    | Competition and a reason to come back          | Duels, ratings, streaks             |
| Recruiter / reviewer | Evidence of engineering depth                  | Live demo, docs, clean architecture |

## 5. User journeys

**J-1 First lesson.** Visitor lands → signs up with email or Google → sees the Python path with node 1 active → opens it → reads the prompt → edits starter code → presses Run → sees 3/3 tests pass → confetti, +10 XP, streak 1 → node 2 unlocks.

**J-2 Stuck on an exercise.** Learner submits → 1/3 tests pass, stderr shows an error → presses "Explain my error" → gets a short explanation pointing at the line → presses "Hint" → gets a nudge, no solution → fixes it → passes.

**J-3 First duel.** Learner presses "Find a duel" → waits in queue → matched → both see the same buggy program and a 5-minute timer → opponent bar shows "2/5 passing" → learner submits a fix that passes 5/5 first → server declares the win → rating changes shown for both.

**J-4 Coming back.** Learner returns next day → streak shows 2 → leaderboard shows weekly XP rank → continues the path.

## 6. Functional requirements

### 6.1 Accounts and profile

| ID    | Requirement                                                   | Priority | Acceptance criteria                                            |
| ----- | ------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| FR-01 | Sign up and log in with email or Google via Supabase Auth     | Must     | New user can sign up, log out, log in; session survives reload |
| FR-02 | Profile shows username, XP, streak, rating, lessons completed | Must     | `GET /me` returns these; profile page renders them             |

### 6.2 Lessons

| ID    | Requirement                                                                     | Priority | Acceptance criteria                                           |
| ----- | ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| FR-03 | Content structure: course → units → lessons → exercises                         | Must     | Seed loader imports `content/python/*.json` into these tables |
| FR-04 | Lesson path shows locked / active / completed nodes; only the next node unlocks | Must     | Opening a locked lesson returns 403                           |
| FR-05 | Exercise page shows prompt, starter code, editor, sample tests                  | Must     | Sample tests visible; hidden tests never in any response      |
| FR-16 | Content loaded from seed files, re-runnable without duplicates                  | Must     | Running the seed twice leaves the same row count              |

### 6.3 Submissions and grading

| ID    | Requirement                                                                      | Priority | Acceptance criteria                                                                         |
| ----- | -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| FR-06 | Code runs in Piston; server grades against hidden tests looked up by exercise ID | Must     | Request body contains no test cases; server ignores any sent                                |
| FR-07 | Result shows tests passed / total, stdout and stderr                             | Must     | Each test row shows pass or fail; failed rows show expected vs actual for sample tests only |
| FR-08 | A fully passing submission completes the lesson and unlocks the next             | Must     | `user_progress` row set to completed; next lesson becomes active                            |

### 6.4 Gamification

| ID    | Requirement                                                                                             | Priority | Acceptance criteria                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| FR-09 | Completing a lesson awards 10 XP, recorded as an event                                                  | Must     | Completing the same lesson twice pays once                                                                             |
| FR-10 | Daily streak (Must); one freeze covers one missed day; earn one freeze per 7-day streak, max 2 (Should) | Must     | Streak logic unit-tested for: same day, next day, one missed; with freezes: one missed with freeze, one missed without |
| FR-11 | Weekly XP leaderboard (Monday 00:00 IST reset)                                                          | Must     | Top 50 shown; current user's rank always shown                                                                         |

### 6.5 AI tutor (Gemini)

| ID    | Requirement                                               | Priority | Acceptance criteria                                                  |
| ----- | --------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| FR-12 | "Explain my error" explains the latest failing submission | Must     | Response under 120 words, references the relevant line when possible |
| FR-13 | "Hint" gives a nudge without the full solution            | Must     | Never returns a complete corrected program                           |
| FR-14 | AI requests capped at 20 per user per day                 | Must     | 21st request returns 429 with a friendly message                     |

### 6.6 Certificates

| ID    | Requirement                                               | Priority | Acceptance criteria                                        |
| ----- | --------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| FR-15 | Completing a track issues a certificate with a public URL | Should   | `/c/:slug` renders without login; shows name, course, date |

### 6.7 Duels

| ID    | Requirement                                                         | Priority | Acceptance criteria                                       |
| ----- | ------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| FR-17 | Join a queue; first two waiting users are paired                    | Must     | Two browsers in queue are matched within 2 s              |
| FR-18 | Rating-band pairing (±150, widening by 100 every 15 s)              | Should   | Unit-tested matcher                                       |
| FR-19 | Same buggy problem for both, 5-minute shared timer                  | Must     | Timer driven by server `endsAt`, not client clocks        |
| FR-20 | Opponent progress (passed / total) shown live; never their code     | Must     | Progress update reaches the opponent in under 500 ms      |
| FR-21 | Server declares winner: first recorded fully passing submission     | Must     | Concurrent passing submissions produce exactly one winner |
| FR-22 | On timeout: most tests passed wins; equal = draw                    | Must     | Covered by state-machine tests                            |
| FR-23 | Disconnect over 30 s forfeits                                       | Should   | Reconnect within 30 s resumes the duel                    |
| FR-24 | ELO update after each duel (K = 32, start 1200); rating leaderboard | Must     | Both ratings update in one transaction                    |
| FR-25 | Lifecycle: waiting → matched → in_progress → completed only         | Must     | Illegal transitions throw                                 |
| FR-26 | Problems from a separate pool of buggy programs with 1–3 bugs       | Must     | At least 15 problems seeded before S7 ends                |

### 6.8 Stretch (Could)

FR-27 replay a finished duel · FR-28 daily "bug of the day" bracket · FR-29 spectate a live duel · FR-30 JavaScript track.

## 7. Non-functional requirements

| ID     | Requirement                                                                           |
| ------ | ------------------------------------------------------------------------------------- |
| NFR-01 | Hidden tests and duel solutions never reach the browser                               |
| NFR-02 | Secrets exist only in `apps/api/.env`                                                 |
| NFR-03 | All routes except `/health` and public certificate pages require a valid Supabase JWT |
| NFR-04 | Piston limits per run: 3 s compile, 3 s run, 256 MB memory                            |
| NFR-05 | Sandboxed code has no network access                                                  |
| NFR-06 | Submissions limited to 10 per user per minute                                         |
| NFR-07 | At most 20 concurrent active duels (v1)                                               |
| NFR-08 | AI calls capped at 20 per user per day                                                |
| NFR-09 | Graded submission returns in under 3 s (p95)                                          |
| NFR-10 | Duel progress events delivered in under 500 ms                                        |
| NFR-11 | One winner per duel enforced in the database                                          |
| NFR-12 | XP and streak updates are idempotent                                                  |
| NFR-13 | WCAG AA contrast; Ink text on orange                                                  |
| NFR-14 | Animations respect `prefers-reduced-motion`                                           |
| NFR-15 | Structured logs; Sentry in Phase 3                                                    |
| NFR-16 | CI runs lint, typecheck and tests on every push                                       |

## 8. Open questions

- Failed-test colour: strict three-colour system, or one muted red for pass/fail only?
- Keep the name "Loophole", or use "Loophole.gg" to avoid the tunnelling tool of the same name?
- VPS provider: Hetzner, DigitalOcean or AWS Lightsail?
