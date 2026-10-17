import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { lessons } from './content.js';
import { profiles } from './profiles.js';

// One row per lesson a user has completed; no row means not done yet.
// The primary key makes "a lesson completes once per user" a database rule.
export const userProgress = pgTable(
  'user_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    status: text('status').$type<'completed'>().notNull().default('completed'),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
).enableRLS();
