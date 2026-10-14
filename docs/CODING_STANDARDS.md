# Loophole — Coding Standards

Conventions every file follows. AI assistants should apply these without being asked.

## 1. TypeScript

- `strict: true` in every `tsconfig.json`. No `any`; use `unknown` and narrow.
- Prefer `type` for data shapes and `interface` for contracts a class implements.
- Domain entities are plain classes with `readonly` fields and no framework imports.
- No default exports except Next.js pages and layouts.
- Async functions return `Promise<T>` explicitly in services and interfaces.

## 2. Naming

| Thing                  | Convention               | Example                                        |
| ---------------------- | ------------------------ | ---------------------------------------------- |
| Files                  | kebab-case               | `submissions.service.ts`, `piston-executor.ts` |
| Classes                | PascalCase               | `SubmissionsService`, `PistonExecutor`         |
| Interfaces (contracts) | `I` prefix               | `ICodeExecutor`                                |
| DI tokens              | SCREAMING_SNAKE          | `CODE_EXECUTOR`                                |
| DTOs                   | `<Action>Dto`            | `CreateSubmissionDto`                          |
| Events                 | `noun.past-verb`         | `lesson.completed`                             |
| Errors                 | `<Reason>Error`          | `LessonLockedError`                            |
| DB tables / columns    | snake_case               | `user_progress.completed_at`                   |
| React components       | PascalCase file and name | `LessonNode.tsx`                               |
| Hooks                  | `use` prefix             | `useDuelSocket`                                |

## 3. Backend rules

- Controllers: parse, validate, call one service method, shape the response. No business logic.
- Services: depend on interfaces through DI tokens. Never import Drizzle, Supabase, Piston or Gemini clients.
- Repositories: return domain entities, never raw rows.
- Throw typed domain errors; a global filter maps them to HTTP.
- Read config through `@nestjs/config`, validated at startup (fail fast if a key is missing).
- Log with the Nest/pino logger, never `console.log`. Never log tokens, keys or user code.

## 4. Frontend rules

- Server data through TanStack Query hooks in `lib/queries/`; no fetch calls inside components.
- Local UI state in component state or zustand stores in `lib/stores/`.
- One API client (`lib/api.ts`) attaches the Supabase token.
- Use design tokens from `DESIGN_SYSTEM.md`; no raw hex values in components.
- Every interactive element is reachable by keyboard and has a visible focus ring.

## 5. Testing

| What                                                | Tool                     | Rule                                                    |
| --------------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| Services                                            | Vitest                   | Every public method; fakes for every injected interface |
| Domain logic (streaks, ELO, state machine, matcher) | Vitest                   | Table-driven tests for every branch                     |
| Repositories                                        | Vitest + a test database | Happy path and constraint violations                    |
| Components                                          | Vitest + Testing Library | Behaviour, not snapshots                                |
| End to end                                          | Playwright               | J-1 first lesson, J-3 duel (two browser contexts)       |

A milestone is not done until its tests pass in CI.

## 6. Git

- Branches: `m<N>-<short-name>`, e.g. `m4-piston-executor`.
- Commits follow Conventional Commits with the requirement ID when there is one:
  `feat(submissions): FR-06 grade against hidden tests`
  `fix(duels): FR-21 prevent double winner`
  `docs: update ROADMAP after M3`
- Small commits, one idea each. Merge to `main` only when CI is green.

## 7. Environment variables

`apps/api/.env` (never committed; `.env.example` is):

```
PORT=3001
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
PISTON_URL=http://piston:2000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
AI_DAILY_LIMIT=20
CORS_ORIGIN=http://localhost:3000
SENTRY_DSN=
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Only `NEXT_PUBLIC_*` values may appear in the web app, and none of them are secrets.

## 8. Definition of done (every task)

- [ ] Follows the layer rules in `ARCHITECTURE.md`
- [ ] Tests written and passing
- [ ] No secrets, hidden tests or answers reachable from the client
- [ ] Types shared through `packages/shared` where both apps use them
- [ ] Relevant doc in `docs/` updated if behaviour changed
