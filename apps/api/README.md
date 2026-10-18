# @loophole/api

The Loophole backend: a plain NestJS app (ADR-015). It grades code in Piston, stores data in Supabase Postgres through Drizzle, and calls Gemini for hints. See `docs/ARCHITECTURE.md` §2 for the rules.

## Layout

```
src/
  main.ts                  bootstrap, CORS
  app.module.ts            root module, config validation
  config/                  env validation (fails fast on a missing key)
  modules/<feature>/       module, controller, service, dto/
  db/                      Drizzle schema, DbService, migrations      (from S1)
  integrations/            piston.client.ts, gemini.client.ts          (from S3 / S5)
  common/                  global exception filter                     (from S1)
```

Request path: controller (validates the DTO) → service (rules + Drizzle queries) → `DbService` / `PistonClient` / `GeminiClient`.

## Run

From the repo root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in the values
pnpm piston:up                           # local Piston in Docker
pnpm dev:api                             # http://localhost:3001/health
```

## Deploy

`Dockerfile` builds the production image from the repo root; `docs/DEPLOY.md` has the full steps.

## Duel load test

`scripts/duel-soak.ts` plays N duels between two real accounts against a running API and checks each one: both players land in the same duel, the opponent sees progress, there is exactly one result, the fix wins, and the rating changes add up to 0. It also reports how fast progress reaches the opponent (NFR-10: under 500 ms).

1. Sign in as two **test** accounts (every duel is real and changes their ratings), e.g. one normal window and one private window.
2. In each window: DevTools → Network → click any request to the API (e.g. `me`) → Headers → copy the `Authorization` value after `Bearer `. Tokens last about an hour.
3. Run, from the repo root (the fixes come from the git-ignored `content-solutions/duels/`):

```bash
SOAK_URL=https://<api-domain> SOAK_TOKEN_A=<token> SOAK_TOKEN_B=<token> SOAK_DUELS=50 pnpm --filter @loophole/api soak:duels
```

It paces itself to about 3.5 s a duel (queue joins are limited to 20 a minute per user), so 50 duels take about 3 minutes. `test/duel-soak.e2e-spec.ts` runs the same script against the test app in CI.

## Check

```bash
pnpm --filter @loophole/api lint
pnpm --filter @loophole/api typecheck
pnpm --filter @loophole/api test         # unit tests
pnpm --filter @loophole/api test:e2e     # HTTP tests against the app
```
