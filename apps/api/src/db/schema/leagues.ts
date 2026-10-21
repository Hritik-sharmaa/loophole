import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

// Weekly leagues (ADR-038). A group is up to 20 learners in one tier for
// one IST week (Monday to Monday). Groups are made as learners join.
export const leagueGroups = pgTable(
  'league_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // The IST Monday the week starts, "YYYY-MM-DD".
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    // 0 Bronze, 1 Silver, 2 Gold, 3 Diamond.
    tier: smallint('tier').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('league_groups_tier', sql`${t.tier} between 0 and 3`),
    // Joining looks for this week's open groups in a tier.
    index('league_groups_week_tier').on(t.weekStart, t.tier),
  ],
).enableRLS();

// A learner's place in one week's group: joined with their first XP of the
// week. One row per learner per week.
export const leagueMembers = pgTable(
  'league_members',
  {
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => leagueGroups.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.weekStart, t.userId] }),
    index('league_members_group').on(t.groupId),
  ],
).enableRLS();
