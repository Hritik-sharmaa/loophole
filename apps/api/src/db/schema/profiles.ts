import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';

// One row per signed-in user, created on their first API request.
// id is the Supabase Auth user id (docs/DATA_MODEL.md "profiles").
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    username: text('username').notNull().unique(),
    avatarUrl: text('avatar_url'),
    // XP a day the learner aims for, picked in the welcome (ADR-033);
    // null until then.
    dailyGoal: smallint('daily_goal'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'profiles_username_length',
      sql`char_length(${table.username}) between 3 and 20`,
    ),
    check('profiles_daily_goal', sql`${table.dailyGoal} in (10, 20, 30)`),
  ],
  // RLS on with no policies: the browser's anon key can read nothing.
  // The API connects as the database owner, which bypasses RLS.
).enableRLS();

export type Profile = typeof profiles.$inferSelect;
