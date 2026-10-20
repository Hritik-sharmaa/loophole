import {
  date,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { duelProblems } from './duels.js';
import { profiles } from './profiles.js';

// Bug of the day (FR-28, ADR-035): one row per learner per IST day they
// open the day's bug. The clock runs from opened_at to the first passing
// submission (solved_at); both are server times. The row's id is the
// xp_events source id, so the day's XP can only be paid once.
export const dailyBugPlays = pgTable(
  'daily_bug_plays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    // An IST calendar day, "YYYY-MM-DD".
    day: date('day', { mode: 'string' }).notNull(),
    // The bug this learner got: today's pick when they first opened it.
    problemId: uuid('problem_id')
      .notNull()
      .references(() => duelProblems.id, { onDelete: 'cascade' }),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    solvedAt: timestamp('solved_at', { withTimezone: true }),
    // Graded submissions so far, the failed ones included.
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [
    unique('daily_bug_plays_once_a_day').on(t.userId, t.day),
    // Today's board: the day's solved rows.
    index('daily_bug_plays_board').on(t.day, t.solvedAt),
  ],
).enableRLS();
