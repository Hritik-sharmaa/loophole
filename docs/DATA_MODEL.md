# Loophole — Data Model

Postgres on Supabase, defined in Drizzle (`apps/api/src/db/schema/*.ts`) and migrated with drizzle-kit. Create each table in the milestone that needs it (column "Milestone").

Conventions: `uuid` primary keys (`gen_random_uuid()`), `timestamptz` in UTC, snake_case columns, `created_at` default `now()`. Foreign keys cascade on delete unless noted.

## Tables

### profiles — S1

| Column     | Type        | Notes                                                                                       |
| ---------- | ----------- | ------------------------------------------------------------------------------------------- |
| id         | uuid PK     | = `auth.users.id`                                                                           |
| username   | text        | unique, 3–20 chars of a–z, 0–9, _ ; auto-generated on first login, editable via `PATCH /me` |
| avatar_url | text        | nullable                                                                                    |
| created_at | timestamptz |                                                                                             |

### courses — S2

| Column   | Type    | Notes                               |
| -------- | ------- | ----------------------------------- |
| id       | uuid PK |                                     |
| slug     | text    | unique, e.g. `python`               |
| language | text    | Piston language name, e.g. `python` |
| title    | text    |                                     |

### units — S2

| Column    | Type              | Notes                                         |
| --------- | ----------------- | --------------------------------------------- |
| id        | uuid PK           |                                               |
| course_id | uuid FK → courses |                                               |
| slug      | text              | unique per course                             |
| title     | text              |                                               |
| position  | int               | order in course; unique (course_id, position) |

### lessons — S2

| Column   | Type            | Notes                                                                                      |
| -------- | --------------- | ------------------------------------------------------------------------------------------ |
| id       | uuid PK         |                                                                                            |
| unit_id  | uuid FK → units |                                                                                            |
| slug     | text            | unique per unit                                                                            |
| title    | text            |                                                                                            |
| position | int             | unique (unit_id, position)                                                                 |
| learn    | jsonb, nullable | Learn step: `{ cards, check }` (ADR-021, CONTENT_GUIDE §3); returned by `GET /lessons/:id` |

### exercises — S2

| Column       | Type              | Notes                                                         |
| ------------ | ----------------- | ------------------------------------------------------------- |
| id           | uuid PK           |                                                               |
| lesson_id    | uuid FK → lessons | one exercise per lesson in v1                                 |
| prompt       | text              | Markdown                                                      |
| starter_code | text              |                                                               |
| sample_tests | jsonb             | `[{ input, expectedOutput }]` — shown to learner              |
| hidden_tests | jsonb             | `[{ input, expectedOutput }]` — **never returned by the API** |

### user_progress — S2

| Column       | Type               | Notes                            |
| ------------ | ------------------ | -------------------------------- |
| user_id      | uuid FK → profiles |                                  |
| lesson_id    | uuid FK → lessons  |                                  |
| status       | text               | `completed` (absence = not done) |
| completed_at | timestamptz        |                                  |
|              |                    | **PK (user_id, lesson_id)**      |

### submissions — S3

| Column       | Type                | Notes                                                                                    |
| ------------ | ------------------- | ---------------------------------------------------------------------------------------- |
| id           | uuid PK             |                                                                                          |
| user_id      | uuid FK → profiles  |                                                                                          |
| exercise_id  | uuid FK → exercises |                                                                                          |
| code         | text                | max 20 KB (validated in DTO)                                                             |
| status       | text                | `passed` \| `failed` \| `error`                                                          |
| tests_passed | int                 |                                                                                          |
| total_tests  | int                 |                                                                                          |
| stderr       | text                | truncated to 4 KB                                                                        |
| results      | jsonb               | what the learner was shown: sample details, hidden pass/fail only (S5, for the AI tutor) |
| submitted_at | timestamptz         | index (user_id, exercise_id, submitted_at desc)                                          |

### xp_events — S4

| Column     | Type               | Notes                                                     |
| ---------- | ------------------ | --------------------------------------------------------- |
| id         | uuid PK            |                                                           |
| user_id    | uuid FK → profiles |                                                           |
| amount     | int                |                                                           |
| source     | text               | `lesson` in v1 (more sources may be added later)          |
| source_id  | uuid               | the lesson id                                             |
| created_at | timestamptz        | index (created_at) for weekly board                       |
|            |                    | **unique (user_id, source, source_id)** — stops double XP |

### streaks — S4

| Column            | Type                  | Notes                    |
| ----------------- | --------------------- | ------------------------ |
| user_id           | uuid PK FK → profiles |                          |
| current_streak    | int                   | default 0                |
| longest_streak    | int                   | default 0                |
| last_active_date  | date                  | in Asia/Kolkata calendar |
| freezes_available | int                   | default 0, max 2         |

### ai_usage — S5

| Column  | Type               | Notes                                                                  |
| ------- | ------------------ | ---------------------------------------------------------------------- |
| user_id | uuid FK → profiles |                                                                        |
| day     | date               | IST calendar day, like streaks                                         |
| count   | int                |                                                                        |
|         |                    | **PK (user_id, day)**; increment with `insert … on conflict do update` |

### duel_problems — S7

| Column       | Type    | Notes                      |
| ------------ | ------- | -------------------------- |
| id           | uuid PK |                            |
| slug         | text    | unique                     |
| language     | text    |                            |
| title        | text    |                            |
| description  | text    | what the program should do |
| buggy_code   | text    | given to both players      |
| sample_tests | jsonb   | shown                      |
| hidden_tests | jsonb   | never returned             |
| difficulty   | int     | 1–3                        |

### duels — S7

| Column     | Type                    | Notes                                             |
| ---------- | ----------------------- | ------------------------------------------------- |
| id         | uuid PK                 |                                                   |
| problem_id | uuid FK → duel_problems |                                                   |
| player_a   | uuid FK → profiles      |                                                   |
| player_b   | uuid FK → profiles      |                                                   |
| status     | text                    | `matched` \| `in_progress` \| `completed`         |
| result     | text                    | nullable: `win` \| `draw` \| `forfeit`            |
| winner_id  | uuid                    | nullable; set only with `where winner_id is null` |
| started_at | timestamptz             |                                                   |
| ends_at    | timestamptz             | server-side deadline                              |
| ended_at   | timestamptz             | nullable                                          |
| created_at | timestamptz             | newest live duel per player (resume)              |
|            |                         | check (player_a <> player_b); index (status)      |

`waiting` is a queue state held in memory, so it never appears in this table.

### duel_submissions — S7

| Column       | Type               | Notes                                                 |
| ------------ | ------------------ | ----------------------------------------------------- |
| id           | uuid PK            |                                                       |
| duel_id      | uuid FK → duels    |                                                       |
| user_id      | uuid FK → profiles |                                                       |
| code         | text               |                                                       |
| tests_passed | int                |                                                       |
| total_tests  | int                |                                                       |
| submitted_at | timestamptz        | index (duel_id, submitted_at) — used for replay later |

### ratings — S8

| Column     | Type                  | Notes        |
| ---------- | --------------------- | ------------ |
| user_id    | uuid PK FK → profiles |              |
| elo        | int                   | default 1200 |
| wins       | int                   | default 0    |
| losses     | int                   | default 0    |
| draws      | int                   | default 0    |
| updated_at | timestamptz           |              |

### certificates — Phase 3

| Column      | Type               | Notes                       |
| ----------- | ------------------ | --------------------------- |
| id          | uuid PK            |                             |
| user_id     | uuid FK → profiles |                             |
| course_id   | uuid FK → courses  |                             |
| public_slug | text               | unique, random 10 chars     |
| issued_at   | timestamptz        |                             |
|             |                    | unique (user_id, course_id) |

## Relationships

```
courses 1─* units 1─* lessons 1─1 exercises
profiles 1─* user_progress *─1 lessons
profiles 1─* submissions *─1 exercises
profiles 1─* xp_events
profiles 1─1 streaks, ratings
duel_problems 1─* duels *─2 profiles
duels 1─* duel_submissions
```

## Rules that live in the database

| Rule                                | Enforced by                                      |
| ----------------------------------- | ------------------------------------------------ |
| A lesson completes once per user    | PK on user_progress                              |
| XP pays once per source             | unique (user_id, source, source_id) on xp_events |
| One winner per duel                 | conditional update `where winner_id is null`     |
| A player cannot duel themselves     | check constraint on duels                        |
| One certificate per course per user | unique on certificates                           |

## Row-level security

The API connects with the service key and enforces access in code. Enable RLS on every table with no public policies, so the anon key the browser holds can read nothing directly.
