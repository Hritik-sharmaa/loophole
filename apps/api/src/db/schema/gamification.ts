import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

// One row per XP payment (docs/DATA_MODEL.md). The unique constraint is
// what makes XP idempotent: the same lesson can never pay a user twice.
export const xpEvents = pgTable(
  'xp_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    // 'lesson' in v1; source_id is then the lesson id.
    source: text('source').$type<'lesson'>().notNull(),
    sourceId: uuid('source_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('xp_events_once_per_source').on(t.userId, t.source, t.sourceId),
    // The weekly board sums events since Monday.
    index('xp_events_created_at').on(t.createdAt),
  ],
).enableRLS();

// One row per user who has ever completed a lesson.
export const streaks = pgTable(
  'streaks',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    // An IST calendar day, kept as "YYYY-MM-DD".
    lastActiveDate: date('last_active_date', { mode: 'string' }),
    // Earned and spent in Phase 3 (FR-10 freezes); always 0 until then.
    freezesAvailable: integer('freezes_available').notNull().default(0),
  },
  (t) => [
    check('streaks_freezes_range', sql`${t.freezesAvailable} between 0 and 2`),
  ],
).enableRLS();
