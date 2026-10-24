# Loophole

**Learn to code. Then out-code your friends.**

Loophole is a free web app that teaches coding from zero, in English or Hinglish, with real code graded on a server. When you've learned something, you can race a friend to fix the same buggy program in a live 1v1 debugging duel.

**Try it:** <https://loophole-psi.vercel.app>

![Loophole: learn to code, then out-code your friends](https://loophole-psi.vercel.app/opengraph-image)

## What you can do

**Learn**

- **Four courses, 90 lessons, 18 projects.** Each lesson is a few short cards, a quick question, then real code you write in the browser.
- **Real grading.** Python and JavaScript run in a sandbox against sample and hidden tests; HTML & CSS pages are checked rule by rule; Git runs in a safe practice terminal.
- **English or Hinglish.** Every lesson is written twice, by hand. Switch any time on your profile.
- **An AI tutor that doesn't do your homework.** "Explain my error", "Hint" and "Explain it differently" nudge you towards the fix, never the answer (20 a day).
- **Help when you need it:** a cheat sheet and a Bug hunt review for every unit, a practice stop that mixes old questions, and read-aloud guide bubbles.
- **A certificate** with its own public link when you finish a course, ready for LinkedIn.

**Compete**

- **Live debugging duels.** Same broken program, five minutes, first fix that passes every test wins. The server decides, and your Elo rating moves.
- **Practice duels** against Meera, Arjun or Harpreet when nobody else is online, and **replays** of your past duels.
- **Bug of the day:** one bug for everyone, with a board of the fastest fixes.
- **XP, streaks, a daily goal and weekly leagues** of up to 20 learners, with promotion and demotion.

**Make it yours**

- **An avatar maker:** hair, face, clothes, glasses, a cat on your head.
- **Install it on your phone** as an app (PWA); pages you've seen open offline.

| Course       | Lessons | Projects | Guide    | Runs in                           |
| ------------ | ------: | -------: | -------- | --------------------------------- |
| Python       |      40 |        7 | Priya    | Python 3.12 (Piston sandbox)      |
| JavaScript   |      20 |        5 | Arjun    | Node 20 (Piston sandbox)          |
| HTML & CSS   |      15 |        3 | Meera    | Parsed and checked, live preview  |
| Git & GitHub |      15 |        3 | Harpreet | Simulated terminal and repository |

## How it works

![Loophole system design](docs/diagrams/system-design.svg)

- **The browser is never trusted.** Grades, XP, streaks, ratings and duel winners are worked out on the server. Hidden tests, duel solutions and API keys never leave it.
- **The web app** (Next.js on Vercel) talks to Supabase only to sign in. Everything else goes through the API with the user's token.
- **The API** (NestJS on one VPS, behind Caddy) has 15 small modules. Each has a thin controller and a service that holds the rules. The rules that are easy to get wrong (grading, streaks, Elo, the duel winner, leagues) are pure functions with unit tests.
- **Code runs in Piston,** a sandbox in a separate container with no network, one job at a time.
- **Duels** run over Socket.io. Matchmaking and duel timers live in the API's memory, and the winner is written by a single conditional update, so a duel can never have two winners.
- **Lessons are JSON files** in `content/`, seeded into Postgres. Adding a lesson is a content change, not a code change.

More pictures (modules, request flows, the data model, class and state diagrams, all black and white): [`docs/diagrams/architecture.md`](docs/diagrams/architecture.md). The rules behind them: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tech stack

| Layer        | Choice                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Web          | Next.js 16 (App Router), React 19, Tailwind, CodeMirror, TanStack Query, Framer Motion, GSAP |
| API          | NestJS 12, Socket.io, Drizzle ORM, class-validator                                           |
| Data & auth  | Supabase Postgres and Supabase Auth                                                          |
| Running code | Piston, self-hosted in Docker                                                                |
| AI tutor     | Google Gemini (`@google/genai`)                                                              |
| Tests        | Vitest, PGlite (real Postgres in-process) for API end-to-end tests, Playwright for journeys  |
| Hosting      | Vercel (web); one VPS with Docker Compose and Caddy (API and Piston)                         |

A pnpm monorepo in TypeScript (strict), with the request and socket types shared between both apps.

## Run it locally

You need Node.js 24, pnpm 10 and Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env       # Supabase, Gemini and database values
cp apps/web/.env.example apps/web/.env.local # Supabase URL and anon key
pnpm piston:up                               # local Piston on :2000
bash infra/install-runtimes.sh               # Python and Node inside Piston, once
pnpm --filter @loophole/api db:migrate       # create the tables
pnpm --filter @loophole/api db:seed          # load the courses and duel problems
pnpm dev                                     # web on :3000, API on :3001
```

## Checks

```bash
pnpm format:check && pnpm lint && pnpm typecheck
pnpm test                                    # unit tests, both apps
pnpm --filter @loophole/api test:e2e         # API end-to-end tests on PGlite
pnpm --filter @loophole/web test:e2e         # Playwright journeys in Chromium (mock backend)
```

The first Playwright run needs a browser: `pnpm --filter @loophole/web exec playwright install chromium`. It builds the app into `apps/web/.next-e2e` (your `.next` is left alone) and serves it on port 4020, with the mock backend on 4010. `E2E_REUSE=1` reuses servers that are already running. GitHub Actions runs all of these on every push.

## Repository

```
apps/web         Next.js app (pages, components, data hooks)
apps/api         NestJS API (modules, Drizzle schema and migrations, clients)
packages/shared  types shared by both apps
content/         courses and duel problems as JSON (docs/CONTENT_GUIDE.md)
infra/           Docker Compose, Caddyfile, Piston scripts
docs/            product, architecture, data model, API, design, deploy, decisions
```

| To learn about                       | Read                                             |
| ------------------------------------ | ------------------------------------------------ |
| What each feature must do            | [`docs/PRD.md`](docs/PRD.md)                     |
| How the code is organised            | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)   |
| Tables and constraints               | [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)       |
| Every route and socket event         | [`docs/API_SPEC.md`](docs/API_SPEC.md)           |
| Colours, type, motion and components | [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) |
| Writing lessons and duel problems    | [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md) |
| Putting it online                    | [`docs/DEPLOY.md`](docs/DEPLOY.md)               |
| Why each choice was made             | [`docs/DECISIONS.md`](docs/DECISIONS.md)         |
| What's next                          | [`docs/ROADMAP.md`](docs/ROADMAP.md)             |

Built by [Hritik Sharma](https://github.com/Hritik-sharmaa) as a portfolio project, and as a way to learn system design by building a real full-stack app.
