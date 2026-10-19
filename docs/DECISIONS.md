# Loophole — Decision Log

Every significant choice gets an entry: what was decided, why, and what was given up. Add new entries at the top. AI assistants must not reverse a decision here without the developer adding a new entry.

Format: **ADR-NNN · Title** — Status (Accepted / Superseded by ADR-NNN) · Date

---

**ADR-020 · "Sticker Lab" visual identity and Byte the mascot** — Accepted · 2026-10-19 · Supersedes ADR-005

- Decision: replace black/white/orange with "Sticker Lab": Ink #1B1433 outlines and hard shadows on a dotted lilac canvas, Orange for your move, Blue for done, Lemon for rewards and labels, Pink for rivals. Bricolage Grotesque, DM Sans and JetBrains Mono replace Baloo 2 and Nunito. The mascot is Byte, a robot with a terminal face; the logo is Byte's head plus the wordmark. Spec in `docs/DESIGN_SYSTEM.md`.
- Why: the developer felt the old look was dull and too close to Duolingo. Picked from three directions (Night Shift, Sticker Lab, Blueprint) and three mascots (Loopy, Glitch, Byte) on 2026-10-19.
- Trade-off: four accent colours instead of one, so each needs a fixed meaning (DESIGN_SYSTEM §1) to stay readable. Every page was restyled at once rather than one at a time.

**ADR-019 · Streak freeze rules** — Accepted · 2026-10-19

- Decision: a freeze is earned on every 7th day of a streak (7, 14, 21, …), at most 2 in hand. When the next new lesson comes after missed days, each missed day spends one freeze and the streak continues. If there are fewer freezes than missed days, the streak restarts at 1 and the freezes are kept. The streak shown stays alive while the freezes in hand cover every missed day so far.
- Why: FR-10 and ADR-012 fix the earn rate and the cap but not what happens when freezes cannot cover a gap; keeping them is the kinder reading and keeps the rule simple to explain.
- Trade-off: a user can lose a long streak while still holding freezes (e.g. one freeze, two missed days). Freezes are spent only when a lesson is completed, not at midnight, so no background job is needed.

**ADR-018 · Piston runs one job at a time** — Accepted · 2026-10-18

- Decision: `PistonClient` queues every run, so Piston never receives two jobs at once, across all users. A submission runs its tests one after another and skips the rest after the first time-out.
- Why: the local Piston image (Docker Desktop) crashes its sandbox when jobs overlap ("Sandbox keeper received fatal signal 6"). In testing, about half of parallel runs failed, even at two at a time; every sequential run passed. A crashed sandbox looked like a wrong answer to the learner.
- Trade-off: a run takes about 0.6 s locally, so an 8-test exercise takes about 5 s, over NFR-09 (3 s). Concurrent submissions wait for each other. The queue lives in one `PistonClient` instance, so the API must have exactly one (a shared module once duels use it). Re-test parallel runs on the VPS in S6 and raise the limit if they are stable.
- Re-test 2026-10-18 on the AWS VPS (t3.small, Ubuntu 24.04): sequential 40/40 and parallel 40/40 passed, about 50 ms per run. The crashes are specific to Docker Desktop. Kept at one at a time anyway: an 8-test exercise grades in about 0.4 s on the VPS, well inside NFR-09, and the limit still protects local development. Raise it only if many users grade at the same moment.

**ADR-017 · PGlite for API database tests** — Accepted · 2026-10-17

- Decision: API tests that need a database use `@electric-sql/pglite` (pinned dev dependency): real Postgres compiled to WebAssembly, running inside the test process. `test/support/test-db.ts` applies the real migrations and stubs Supabase's `auth.users`. e2e tests run in CI with no services.
- Why: the unlock rules and "hidden tests never leak" depend on real SQL; fakes would not catch a wrong query. PGlite needs no Docker, no Supabase project and no CI setup.
- Trade-off: PGlite is not Supabase: the `auth` schema and Supabase extensions are absent, and RLS policies are not exercised (the API connects as owner anyway). A staging check against Supabase still happens at deploy (S6).

**ADR-016 · MVP-first slice roadmap and lighter review** — Accepted · 2026-10-17 · Amends ADR-014

- Decision: the roadmap becomes vertical slices (S1–S8), each ending in a feature usable in the browser; M1 "Domain and fakes" is removed and deployment moves before duels. One reviewable piece is one feature slice (backend route + the page that uses it), not one file; explanations are short, with no quiz or Excalidraw step required.
- Why: one-file-at-a-time review and scaffolding-only milestones made progress too slow to finish the project.
- Trade-off: bigger pieces mean less depth per file in review; polish, hardening and scalability work move to Phase 3.

**ADR-015 · Plain NestJS layering for v1** — Accepted · 2026-10-17

- Decision: controllers → services → `DbService` (Drizzle), `PistonClient`, `GeminiClient`. No domain interfaces, Symbol DI tokens, repository classes, hand-written fakes, domain events or typed domain errors. Services query Drizzle directly, call each other directly, and throw Nest's built-in HTTP exceptions with the codes in `API_SPEC.md`. Only the two client files touch Piston and Gemini. Tests cover only logic that is easy to get wrong (grading, streaks, ELO, duel winner, hidden-test leaks).
- Why: the extra layers doubled the files per feature before anything worked. The goal now is a working app first; scalability later.
- Trade-off: swapping a vendor or the ORM touches services, not just a module binding; fewer tests means less safety on refactors. Interfaces, events and Redis can be reintroduced in Phase 3 if needed.
- Changes the layering in `ARCHITECTURE.md` §2, `AGENTS.md` hard rules 4–6, `CODING_STANDARDS.md` §3 and §5, and `AI_TUTOR.md` §2.

**ADR-014 · AI writes the code; developer reviews** — Accepted · 2026-10-11 · Supersedes ADR-001 · Piece size amended by ADR-016

- Decision: AI assistants write the code in small, verified pieces and explain each one; the developer reviews, asks questions, makes changes, and approves before anything is committed. Design decisions stay with the developer: the AI presents options and trade-offs, the developer picks.
- Why: writing every file from scratch, including setup and boilerplate, was slowing progress more than it was teaching. Reviewing working code with explanations keeps the learning goal (G-3) while moving faster.
- Trade-off: reading code teaches less than writing it, so review must be active: the developer follows each request through the code, answers the check questions, and rewrites parts when something is unclear.

**ADR-013 · Tooling: Vitest everywhere, ESLint, Node 24 LTS, Tailwind v4** — Accepted · 2026-10-11

- Decision: Vitest for all unit and integration tests in both apps (Jest is dropped; Playwright stays for e2e). ESLint for linting both apps, replacing the oxlint the API currently uses. Node.js 24 LTS. Tailwind CSS v4, with design tokens defined in CSS through `@theme` instead of `tailwind.config.ts`.
- Why: Vitest already runs in the API and handles its ES-module setup (`"type": "module"`, `.js` import paths) with no extra config, while Jest needs a transformer and module mapping for the same setup; one test runner across the repo means one API to learn. ESLint matches the web app, so there is one linter and one config style everywhere, and it has the larger rule and plugin ecosystem. Node 24 is the current LTS and the installed version; 22 is in maintenance. Tailwind v4 is the version installed with Next.js, and v4 moves configuration into CSS.
- Trade-off: most NestJS docs and tutorials show Jest, so their test snippets need translating (`jest.fn()` → `vi.fn()`, `jest.mock` → `vi.mock`). ESLint is slower than oxlint. Node 26 becomes the next LTS later and will need another bump. Tailwind v3 tutorials and `tailwind.config.ts` examples no longer apply directly.
- Updates the Jest, Node 22 and `tailwind.config.ts` references in `AGENTS.md`, `CODING_STANDARDS.md`, `ROADMAP.md`, `AI_TUTOR.md` and `DESIGN_SYSTEM.md`.

**ADR-012 · Default numeric rules for gamification and duels** — Accepted · 2026-10-02

- Decision: 10 XP per lesson; one streak freeze earned per 7-day streak, max 2; weekly board resets Monday 00:00 IST; duels last 5 minutes; ELO K = 32, start 1200; disconnect forfeit after 30 s.
- Why: sensible starting values so implementation is not blocked. Tune after real play.

**ADR-011 · Exact-match grading on trimmed stdout** — Accepted · 2026-10-02

- Decision: a test passes when trimmed stdout equals trimmed expected output.
- Why: "contains" lets wrong programs pass (printing extra values). Exact match is predictable for beginners if prompts state the output format.

**ADR-010 · In-memory matchmaking queue for v1** — Accepted · 2026-10-02

- Decision: the queue lives in API memory, not Postgres or Redis.
- Why: one API instance, under 100 users; a restart only drops people waiting.
- Trade-off: must move to Redis before running more than one API instance.

**ADR-009 · Socket.io through NestJS for duels** — Accepted · 2026-10-02

- Decision: duel events use NestJS WebSocket gateways with Socket.io. Supersedes the draft idea of Supabase Realtime.
- Why: the server must grade and decide the winner before anything is broadcast; a gateway keeps that authority in one place.

**ADR-008 · Gemini for the AI tutor** — Accepted · 2026-10-02

- Decision: Google Gemini via `@google/genai`, model name from env (default `gemini-flash-latest`), behind `IAiTutor` (changed by ADR-015: behind the plain `GeminiClient` class).
- Why: developer's choice of provider; free tier for development; keeping the SDK in one class keeps a later switch to another provider small.

**ADR-007 · API and Piston on one VPS** — Accepted · 2026-10-02

- Decision: Docker Compose on a single VPS runs the API, Piston and Caddy; the web app is on Vercel.
- Why: Piston needs a privileged container, which managed platforms like Railway, Render and Fly do not offer; WebSockets also need a long-running process.

**ADR-006 · Self-hosted Piston** — Accepted · 2026-10-02

- Decision: run Piston ourselves rather than the public endpoint.
- Why: the public Piston API now requires approval from its maintainer; self-hosting gives control over limits and languages.

**ADR-005 · Black, white and orange visual identity** — Superseded by ADR-020 · 2026-10-02

- Decision: Ink #171717, Paper #FFFFFF, Orange #FF6A00 as the only accent; Baloo 2 and Nunito.
- Why: keeps the Duolingo-style feel while being clearly its own brand; three colours map to three states.

**ADR-004 · Drizzle ORM over the Supabase JS client for data access** — Accepted · 2026-10-02

- Decision: repositories use Drizzle against Supabase Postgres; the Supabase client is used only for auth. (ADR-015: no repository classes; services use Drizzle through `DbService`.)
- Why: typed queries and migrations in code; keeps the database vendor behind repositories.

**ADR-003 · NestJS for the backend** — Accepted · 2026-10-02

- Decision: NestJS rather than plain Express or Next.js API routes.
- Why: its modules, DI container, guards and gateways enforce the layered design the developer wants to learn.

**ADR-002 · Live debugging duels as the differentiator** — Accepted · 2026-10-02

- Decision: build 1v1 real-time duels on buggy programs, not more languages or features Coddy already has.
- Why: a different engagement loop that solo-lesson platforms do not offer; a strong system-design exercise.

**ADR-001 · Developer writes the code; AI tutors** — Superseded by ADR-014 · 2026-10-02

- Decision: AI assistants default to explaining and reviewing; they write full code only in "build mode".
- Why: the project's purpose includes learning HLD and LLD by building.
