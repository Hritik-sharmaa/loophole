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

## Check

```bash
pnpm --filter @loophole/api lint
pnpm --filter @loophole/api typecheck
pnpm --filter @loophole/api test         # unit tests
pnpm --filter @loophole/api test:e2e     # HTTP tests against the app
```
