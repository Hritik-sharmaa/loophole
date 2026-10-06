# Loophole — Decision Log

Every significant choice gets an entry: what was decided, why, and what was given up. Add new entries at the top. AI assistants must not reverse a decision here without the developer adding a new entry.

Format: **ADR-NNN · Title** — Status (Accepted / Superseded by ADR-NNN) · Date

---

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
- Decision: Google Gemini via `@google/genai`, model name from env (default `gemini-flash-latest`), behind `IAiTutor`.
- Why: developer's choice of provider; free tier for development; the interface keeps a later switch to another provider to one class.

**ADR-007 · API and Piston on one VPS** — Accepted · 2026-10-02
- Decision: Docker Compose on a single VPS runs the API, Piston and Caddy; the web app is on Vercel.
- Why: Piston needs a privileged container, which managed platforms like Railway, Render and Fly do not offer; WebSockets also need a long-running process.

**ADR-006 · Self-hosted Piston** — Accepted · 2026-10-02
- Decision: run Piston ourselves rather than the public endpoint.
- Why: the public Piston API now requires approval from its maintainer; self-hosting gives control over limits and languages.

**ADR-005 · Black, white and orange visual identity** — Accepted · 2026-10-02
- Decision: Ink #171717, Paper #FFFFFF, Orange #FF6A00 as the only accent; Baloo 2 and Nunito.
- Why: keeps the Duolingo-style feel while being clearly its own brand; three colours map to three states.

**ADR-004 · Drizzle ORM over the Supabase JS client for data access** — Accepted · 2026-10-02
- Decision: repositories use Drizzle against Supabase Postgres; the Supabase client is used only for auth.
- Why: typed queries and migrations in code; keeps the database vendor behind repositories.

**ADR-003 · NestJS for the backend** — Accepted · 2026-10-02
- Decision: NestJS rather than plain Express or Next.js API routes.
- Why: its modules, DI container, guards and gateways enforce the layered design the developer wants to learn.

**ADR-002 · Live debugging duels as the differentiator** — Accepted · 2026-10-02
- Decision: build 1v1 real-time duels on buggy programs, not more languages or features Coddy already has.
- Why: a different engagement loop that solo-lesson platforms do not offer; a strong system-design exercise.

**ADR-001 · Developer writes the code; AI tutors** — Accepted · 2026-10-02
- Decision: AI assistants default to explaining and reviewing; they write full code only in "build mode".
- Why: the project's purpose includes learning HLD and LLD by building.
