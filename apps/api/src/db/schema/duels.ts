import type { DuelResultKind, DuelStatus, TestCase } from '@loophole/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

// Live 1v1 debugging duels (docs/DATA_MODEL.md, S7).

// The pool of buggy programs, loaded from content/duels/ by the seed.
// hidden_tests must never be selected into a socket event (hard rule 2).
export const duelProblems = pgTable(
  'duel_problems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    language: text('language').notNull(),
    title: text('title').notNull(),
    // What the program should do.
    description: text('description').notNull(),
    // Given to both players.
    buggyCode: text('buggy_code').notNull(),
    sampleTests: jsonb('sample_tests').$type<TestCase[]>().notNull(),
    hiddenTests: jsonb('hidden_tests').$type<TestCase[]>().notNull(),
    difficulty: integer('difficulty').notNull(),
  },
  (t) => [
    check('duel_problems_difficulty', sql`${t.difficulty} between 1 and 3`),
  ],
).enableRLS();

// One row per match. 'waiting' lives only in the in-memory queue, so it is
// never a status here. winner_id is set only by a conditional update
// (`where winner_id is null`), which is what makes "one winner" a database
// rule (FR-21).
export const duels = pgTable(
  'duels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => duelProblems.id, { onDelete: 'cascade' }),
    playerA: uuid('player_a')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    playerB: uuid('player_b')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text('status').$type<DuelStatus>().notNull(),
    result: text('result').$type<DuelResultKind>(),
    winnerId: uuid('winner_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    // The server-side deadline; clients only count down to it.
    endsAt: timestamp('ends_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('duels_two_players', sql`${t.playerA} <> ${t.playerB}`),
    // Finding a player's live duel (resume after a reload).
    index('duels_status').on(t.status),
  ],
).enableRLS();

// Every graded attempt in a duel.
export const duelSubmissions = pgTable(
  'duel_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    duelId: uuid('duel_id')
      .notNull()
      .references(() => duels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    testsPassed: integer('tests_passed').notNull(),
    totalTests: integer('total_tests').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Best score per player at timeout now; replay (FR-27) later.
  (t) => [index('duel_submissions_duel_time').on(t.duelId, t.submittedAt)],
).enableRLS();
