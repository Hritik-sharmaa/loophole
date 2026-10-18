# Loophole

**Learn to code, one bug at a time.** Loophole is a Duolingo-style web app for learning Python. You follow a lesson path, write real code in the browser, get graded in a sandbox on the server, and earn XP, streaks and a weekly rank. When you're stuck, an AI tutor explains your error or gives a hint, never the answer.

Coming next: **live 1v1 debugging duels.** Two players get the same buggy program and race to fix it, and the server decides the winner.

**Demo:** <https://loophole-psi.vercel.app>

## Features

- **Lesson path:** units of short exercises; each one unlocks the next.
- **Real grading:** your code runs in [Piston](https://github.com/engineer-man/piston) against sample and hidden tests. Only pass or fail for a hidden test ever leaves the server.
- **XP, streaks and a weekly leaderboard:** idempotent, so XP for a lesson is paid exactly once.
- **AI tutor:** "Explain my error" and "Hint" through Google Gemini, capped at 20 a day per user.

## Stack

| Layer   | Choice                                                             |
| ------- | ------------------------------------------------------------------ |
| Web     | Next.js (App Router), Tailwind, CodeMirror, TanStack Query         |
| API     | NestJS, Drizzle ORM, class-validator                               |
| Data    | Supabase Postgres + Supabase Auth                                  |
| Grading | Piston, self-hosted in Docker                                      |
| AI      | Google Gemini (`@google/genai`)                                    |
| Tests   | Vitest, PGlite (real Postgres in-process) for API end-to-end tests |
| Hosting | Vercel (web); one VPS with Docker Compose + Caddy (API + Piston)   |

## Run it locally

You need Node.js 24, pnpm 10 and Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env       # Supabase, Gemini and DB values
cp apps/web/.env.example apps/web/.env.local # Supabase URL and anon key
pnpm piston:up                               # local Piston on :2000
bash infra/install-runtimes.sh               # Python for Piston, once
pnpm --filter @loophole/api db:migrate       # create the tables
pnpm --filter @loophole/api db:seed          # load the lessons
pnpm dev                                     # web :3000, API :3001
```

## Checks

```bash
pnpm format:check && pnpm lint && pnpm typecheck
pnpm test                                    # unit tests
pnpm --filter @loophole/api test:e2e         # API end-to-end tests on PGlite
```

CI runs all of these on every push.

## Repository

```
apps/web         Next.js app
apps/api         NestJS API
packages/shared  types shared by both apps
content/         lessons as JSON (docs/CONTENT_GUIDE.md)
infra/           Docker Compose, Caddyfile, Piston scripts
docs/            product, architecture, data model, API, deploy
```

Start with [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it fits together, and [`docs/DEPLOY.md`](docs/DEPLOY.md) to put it online.
