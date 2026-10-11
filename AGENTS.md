# AGENTS.md — read this first

This file tells any AI coding assistant (Claude, Gemini, Cursor, Copilot, Codex) what Loophole is, how it is built, and how to work with its developer. Read it fully before answering anything about this repo, then open the doc in `docs/` that matches the task.

## 1. What Loophole is

Loophole is a Duolingo-style web app for learning to code. Learners move along a lesson path, write real code in an in-browser editor, get graded in a sandbox, and earn XP and streaks. Its differentiator is **live 1v1 debugging duels**: two players get the same buggy program and race to fix it; the server decides the winner.

It is a solo portfolio project. Its second purpose is to teach the developer production-grade system design (HLD and LLD).

## 2. How to work with the developer — IMPORTANT

**AI writes, the developer reviews** (ADR-014). The AI writes the code; the developer (Hritik) reviews every piece, asks questions, and makes changes. The developer still owns every design decision. The goal is still for the developer to learn system design, so each change must teach as well as work.

**Review mode (default):**
- **Design decisions belong to the developer.** When there is a real choice (where code lives, which pattern, a trade-off), present 2–3 options with their trade-offs and wait for a pick. Don't decide silently.
- **Small pieces.** One reviewable unit at a time (a module, a config change, a migration), not a whole milestone in one go. Don't start the next piece until the current one is approved.
- **Verify before handing over.** Run the tests, the build, and a real request or command where possible, and report what passed.
- **Explain every file.** Its one job, the NestJS or architecture concept it uses, and why it is shaped that way, in plain language.
- **Give a "what to check" list** and one or two questions that test understanding of the piece.
- **Commit only after the developer approves**, one idea per commit (see `CODING_STANDARDS.md` §6).
- **Respect the developer's edits.** If they change code after review, build on their version; if a change breaks a rule in this file, say so and explain why.
- Before a milestone is marked done, offer to quiz the developer on its concepts.

**Always:**
- Follow the architecture in `docs/ARCHITECTURE.md`. If a request would break a rule, say so and suggest the compliant way.
- Never invent requirements. If something is not in `docs/`, ask or flag it as an open question.
- Keep answers specific to this repo's stack and names.
- If you recommend a library or API, prefer what is already listed in section 4; check that the API you describe is current.

## 3. Hard rules (never break these)

1. **The client is never trusted.** Grading, XP, streaks, ratings and duel winners are computed on the server only.
2. **Hidden test cases and duel solutions never leave the server.** No API response may include `hidden_tests`.
3. **Secrets live only in `apps/api/.env`.** `GEMINI_API_KEY`, `SUPABASE_SERVICE_KEY` and `PISTON_URL` never reach the frontend bundle.
4. **Dependencies point inward.** Controllers → services → domain interfaces ← infrastructure. A service never imports Drizzle, Supabase, Piston or `@google/genai` directly.
5. **One job per class.** If a class description needs "and", split it.
6. **Every service has unit tests against fakes** (fake executor, in-memory repository, fake AI tutor).
7. **Idempotent rewards.** The same completion never pays XP twice; a duel never has two winners.
8. **Text on orange is Ink (#171717), never white** (white fails contrast).

## 4. Stack (decided — do not swap without an entry in `docs/DECISIONS.md`)

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces: `apps/web`, `apps/api`, `packages/shared` |
| Runtime | Node.js 24 LTS, TypeScript (strict) |
| Backend | NestJS, @nestjs/event-emitter, @nestjs/websockets + Socket.io, @nestjs/throttler |
| Database | Supabase Postgres via Drizzle ORM (drizzle-kit migrations) |
| Auth | Supabase Auth; NestJS guard verifies the JWT |
| Code execution | Piston, self-hosted in Docker (privileged container) |
| AI | Google Gemini via `@google/genai` (not the legacy `@google/generative-ai`) |
| Frontend | Next.js App Router, Tailwind, shadcn/ui, CodeMirror, TanStack Query, zustand, Framer Motion |
| Validation | class-validator (API DTOs), zod (frontend forms) |
| Tests | Vitest (API and web), Testing Library (web components), Playwright (e2e) |
| Lint / format | ESLint and Prettier in both apps |
| Hosting | Vercel (web); one VPS with Docker Compose + Caddy (API + Piston); Supabase cloud |

## 5. Repository layout

```
loophole/
  AGENTS.md               ← this file
  apps/
    api/src/
      main.ts
      app.module.ts
      modules/
        auth/             guard, JWT verification
        users/            profiles
        lessons/          courses, units, lessons, exercises, progress
        submissions/      service, controller, domain/, infra/, dto/ (see ARCHITECTURE §2.2)
        gamification/     xp + streak listeners, leaderboard
        ai/               IAiTutor, GeminiTutor, usage limits
        duels/            gateway, matchmaking, state machine, ratings
        certificates/
      shared/             events, base types, utils
      db/                 drizzle schema + migrations
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

| Task | Read |
| --- | --- |
| What a feature must do | `docs/PRD.md` |
| Where code goes, which pattern, request flows | `docs/ARCHITECTURE.md` |
| Tables, columns, constraints | `docs/DATA_MODEL.md` |
| Routes, socket events, payloads | `docs/API_SPEC.md` |
| Colours, fonts, motion, components | `docs/DESIGN_SYSTEM.md` |
| Gemini prompts and limits | `docs/AI_TUTOR.md` |
| Exercise and duel file formats | `docs/CONTENT_GUIDE.md` |
| Naming, testing, git, env | `docs/CODING_STANDARDS.md` |
| What to build next | `docs/ROADMAP.md` |
| Why something was chosen | `docs/DECISIONS.md` |

## 7. Current status

Update this line as milestones finish:

**Current milestone: M0 — Setup.** Nothing is built yet.
