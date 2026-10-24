# Loophole — Coding Standards

Conventions every file follows. AI assistants should apply these without being asked.

## 1. TypeScript

- `strict: true` in every `tsconfig.json`. No `any`; use `unknown` and narrow.
- Use `type` for data shapes. Row types come from the Drizzle schema (`typeof table.$inferSelect`).
- No default exports except Next.js pages and layouts.
- Async functions return `Promise<T>` explicitly in services and clients.

## 2. Naming

| Thing               | Convention               | Example                                        |
| ------------------- | ------------------------ | ---------------------------------------------- |
| Files               | kebab-case               | `submissions.service.ts`, `piston-executor.ts` |
| Classes             | PascalCase               | `SubmissionsService`, `PistonClient`           |
| Clients             | `<Vendor>Client`         | `piston.client.ts` → `PistonClient`            |
| DTOs                | `<Action>Dto`            | `CreateSubmissionDto`                          |
| Error codes         | SCREAMING_SNAKE          | `LESSON_LOCKED` (from `API_SPEC.md`)           |
| DB tables / columns | snake_case               | `user_progress.completed_at`                   |
| React components    | PascalCase file and name | `LessonNode.tsx`                               |
| Hooks               | `use` prefix             | `useDuelSocket`                                |

## 3. Backend rules

- Controllers: parse, validate, call one service method, shape the response. No business logic.
- Services: hold the business rules and query the database through `DbService`. Call other services directly.
- Clients: only `integrations/piston.client.ts` and `integrations/gemini.client.ts` talk to Piston and Gemini.
- Throw Nest's built-in exceptions with an `API_SPEC.md` code, e.g. `new ForbiddenException({ code: 'LESSON_LOCKED', message })`; the global filter shapes the response.
- Never select `hidden_tests` in a query whose result goes to a response.
- Read config through `@nestjs/config`, validated at startup (fail fast if a key is missing).
- Log with Nest's `Logger`, never `console.log`. Never log tokens, keys or user code.

## 4. Frontend rules

- Server data through TanStack Query hooks in `lib/queries/`; no fetch calls inside components.
- Local UI state in component state (`useState`); server data in TanStack Query.
- One API client (`lib/api.ts`) attaches the Supabase token.
- Use design tokens from `DESIGN_SYSTEM.md`; no raw hex values in components.
- Every interactive element is reachable by keyboard and has a visible focus ring.

## 5. Testing

Test the logic that is easy to get wrong; skip tests for plain wiring.

| What                                                             | Tool       | Rule                                                                |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Pure logic (output comparison, streak, ELO, duel winner/timeout) | Vitest     | Table-driven tests for every branch                                 |
| Services with logic worth testing                                | Vitest     | Stub clients with `overrideProvider(...).useValue({ ... vi.fn() })` |
| Hidden-test leaks                                                | Vitest e2e | No lesson or submission response contains `hiddenTests`             |
| End to end                                                       | Playwright | The PRD journeys (J-1 to J-4) in the real web build (ADR-034)       |

A slice is not done until its tests pass in CI.

**Playwright (ADR-034).** `apps/web/e2e/*.e2e.ts` drive the production web build in Chromium against `e2e/mock-backend.mts` (Supabase Auth, every REST route and the `/duels` socket, typed with `@loophole/shared`, reading the real `content/`). Each test signs up its own user, so tests run in parallel without sharing state. Prefer role and text selectors (`getByRole`, `getByText`) to CSS. A new API route the web app calls needs a matching mock route, or the page sees a 404. The API itself is tested by its own e2e suite on PGlite; Playwright tests the web app's flows.

## 6. Git

- Branches: `s<N>-<short-name>`, e.g. `s3-run-and-submit`.
- Commits follow Conventional Commits with the requirement ID when there is one:
  `feat(submissions): FR-06 grade against hidden tests`
  `fix(duels): FR-21 prevent double winner`
  `docs: update ROADMAP after S2`
- Small commits, one idea each. Merge to `main` only when CI is green.

## 7. Environment variables

`apps/api/.env` (never committed; `.env.example` is):

```
PORT=3001
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PISTON_URL=http://piston:2000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
AI_DAILY_LIMIT=20
CORS_ORIGIN=http://localhost:3000
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Only `NEXT_PUBLIC_*` values may appear in the web app, and none of them are secrets.

## 8. Definition of done (every task)

- [ ] Follows the layer rules in `ARCHITECTURE.md` §2
- [ ] Tests for any tricky logic written and passing
- [ ] No secrets, hidden tests or answers reachable from the client
- [ ] Types shared through `packages/shared` where both apps use them
- [ ] Relevant doc in `docs/` updated if behaviour changed
