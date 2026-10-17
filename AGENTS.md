# AGENTS.md — read this first

This file tells any AI coding assistant (Claude, Gemini, Cursor, Copilot, Codex) what Loophole is, how it is built, and how to work with its developer. Read it fully before answering anything about this repo, then open the doc in `docs/` that matches the task.

## 1. What Loophole is

Loophole is a Duolingo-style web app for learning to code. Learners move along a lesson path, write real code in an in-browser editor, get graded in a sandbox, and earn XP and streaks. Its differentiator is **live 1v1 debugging duels**: two players get the same buggy program and race to fix it; the server decides the winner.

It is a solo portfolio project. Its second purpose is to teach the developer system design by building a working full-stack app; deeper LLD patterns come after launch.

## 2. How to work with the developer — IMPORTANT

**AI writes, the developer reviews** (ADR-014, ADR-016). The AI writes the code; the developer (Hritik) reviews, asks questions, and makes changes. **Priority right now: a working app first, kept simple. Scalability comes later.**

**Review mode (default):**

- **One piece = one feature slice.** A slice is a backend route plus the page that uses it, something the developer can click through in the browser. It is not one file at a time. Don't start the next slice until the current one is approved.
- **Real design choices go to the developer.** When a choice matters (a trade-off this file and `docs/` don't settle), present 2–3 short options and wait for a pick. Routine choices follow `docs/ARCHITECTURE.md` without asking.
- **Verify before handing over.** Run the tests, the build, and a real request or command where possible, and report what passed.
- **Explain briefly.** A few lines per slice: what each file does and why. Plain language.
- **Give a short "what to check" list.**
- **The developer creates every branch and commit.** The AI only edits files.
- **Respect the developer's edits.** If they change code after review, build on their version; if a change breaks a rule in this file, say so and explain why.

**Always:**

- Follow the architecture in `docs/ARCHITECTURE.md`. If a request would break a rule, say so and suggest the compliant way.
- Never invent requirements. If something is not in `docs/`, ask or flag it as an open question.
- Keep answers specific to this repo's stack and names.
- If you recommend a library or API, prefer what is already listed in section 4; check that the API you describe is current.

## 3. Hard rules (never break these)

1. **The client is never trusted.** Grading, XP, streaks, ratings and duel winners are computed on the server only.
2. **Hidden test cases and duel solutions never leave the server.** No API response may include `hidden_tests`.
3. **Secrets live only in `apps/api/.env`.** `GEMINI_API_KEY`, `SUPABASE_SERVICE_KEY` and `PISTON_URL` never reach the frontend bundle.
4. **Thin controllers.** Controllers and gateways validate, call one service method, and return. Business rules live in services (ADR-015).
5. **One file per outside system.** Only `integrations/piston.client.ts` talks to Piston, only `integrations/gemini.client.ts` imports `@google/genai`, and only `integrations/supabase-auth.client.ts` calls Supabase Auth. Services use the shared `DbService` for Drizzle; there are no repository classes, interfaces or DI tokens in v1.
6. **Test the logic that is easy to get wrong:** grading, streaks, ELO, the duel winner, and that no response contains hidden tests.
7. **Idempotent rewards.** The same completion never pays XP twice; a duel never has two winners.
8. **Text on orange is Ink (#171717), never white** (white fails contrast).

## 4. Stack (decided — do not swap without an entry in `docs/DECISIONS.md`)

| Layer          | Choice                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Monorepo       | pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`                                                        |
| Runtime        | Node.js 24 LTS, TypeScript (strict)                                                                               |
| Backend        | NestJS, @nestjs/websockets + Socket.io, @nestjs/throttler (@nestjs/event-emitter: later)                          |
| Database       | Supabase Postgres via Drizzle ORM (drizzle-kit migrations)                                                        |
| Auth           | Supabase Auth; NestJS guard verifies the JWT                                                                      |
| Code execution | Piston, self-hosted in Docker (privileged container)                                                              |
| AI             | Google Gemini via `@google/genai` (not the legacy `@google/generative-ai`)                                        |
| Frontend       | Next.js App Router, Tailwind, shadcn/ui, CodeMirror, TanStack Query, zustand, Framer Motion                       |
| Validation     | class-validator (API DTOs), zod (frontend forms)                                                                  |
| Tests          | Vitest (API and web), PGlite for API database tests (ADR-017), Testing Library (web components), Playwright (e2e) |
| Lint / format  | ESLint and Prettier in both apps                                                                                  |
| Hosting        | Vercel (web); one VPS with Docker Compose + Caddy (API + Piston); Supabase cloud                                  |

## 5. Repository layout

```
loophole/
  AGENTS.md               ← this file
  apps/
    api/src/
      main.ts
      app.module.ts
      modules/            each: module, controller, service, dto/ (see ARCHITECTURE §2.2)
        auth/             guard, JWT verification
        users/            profiles
        lessons/          courses, units, lessons, exercises, progress
        submissions/      grading
        gamification/     xp, streaks, leaderboard
        ai/               explain, hint, daily cap
        duels/            gateway, matchmaking, ratings
        certificates/     (Phase 3)
      db/                 drizzle schema, DbService, migrations
      integrations/       piston.client.ts, gemini.client.ts
      common/             exception filter, small utils
    web/
      app/                routes (App Router)
      components/
      lib/                api client, socket client, supabase client
  packages/shared/src/    types imported by both apps
  content/                lesson and duel seed files (JSON)
  infra/                  docker-compose.yml, Caddyfile
  docs/                   everything below
```

## 6. Where to look

| Task                                          | Read                       |
| --------------------------------------------- | -------------------------- |
| What a feature must do                        | `docs/PRD.md`              |
| Where code goes, which pattern, request flows | `docs/ARCHITECTURE.md`     |
| Tables, columns, constraints                  | `docs/DATA_MODEL.md`       |
| Routes, socket events, payloads               | `docs/API_SPEC.md`         |
| Colours, fonts, motion, components            | `docs/DESIGN_SYSTEM.md`    |
| Gemini prompts and limits                     | `docs/AI_TUTOR.md`         |
| Exercise and duel file formats                | `docs/CONTENT_GUIDE.md`    |
| Naming, testing, git, env                     | `docs/CODING_STANDARDS.md` |
| What to build next                            | `docs/ROADMAP.md`          |
| Why something was chosen                      | `docs/DECISIONS.md`        |

## 7. Current status

Update this line as milestones finish:

**Current milestone: S2 — Lessons** (S1 code done; its manual login test waits on the Supabase project). M0 is done: `pnpm dev` runs both apps, local Piston runs Python, and CI runs format, lint, typecheck and tests.
