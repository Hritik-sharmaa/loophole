import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

// How many AI tutor requests a user made on one IST day (FR-14). Counted
// with one atomic upsert, so parallel requests can't slip past the cap.
export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    count: integer('count').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
).enableRLS();
