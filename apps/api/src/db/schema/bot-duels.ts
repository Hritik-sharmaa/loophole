import type { BotDuelResult, BotOpponent } from '@loophole/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { duelProblems } from './duels.js';
import { profiles } from './profiles.js';

// Practice duels against a guide bot (ADR-039): one row per race. The
// bot's pace is fixed when the race starts (bot_schedule); the result is
// set once, by a conditional update, and pays nothing.
export const botDuels = pgTable(
  'bot_duels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => duelProblems.id, { onDelete: 'cascade' }),
    opponent: text('opponent').$type<BotOpponent>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    // Milliseconds after started_at at which the bot passes each test; the
    // last one is when it finishes.
    botSchedule: jsonb('bot_schedule').$type<number[]>().notNull(),
    result: text('result').$type<BotDuelResult>(),
    // The learner's passing submission, the bot's finish, or giving up.
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [
    check(
      'bot_duels_opponent',
      sql`${t.opponent} in ('meera', 'arjun', 'harpreet')`,
    ),
    check(
      'bot_duels_result',
      sql`${t.result} is null or ${t.result} in ('won', 'lost', 'gave-up')`,
    ),
  ],
).enableRLS();
