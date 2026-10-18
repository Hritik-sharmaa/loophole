import type { SubmissionStatus, TestResult } from '@loophole/shared';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { exercises } from './content.js';
import { profiles } from './profiles.js';

// Every graded attempt at an exercise (docs/DATA_MODEL.md).
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    // At most 20 KB, checked by CreateSubmissionDto.
    code: text('code').notNull(),
    status: text('status').$type<SubmissionStatus>().notNull(),
    testsPassed: integer('tests_passed').notNull(),
    totalTests: integer('total_tests').notNull(),
    // Truncated to 4 KB by the service.
    stderr: text('stderr').notNull().default(''),
    // What the learner was shown (TestResult[]): sample details, hidden
    // pass/fail only. The AI tutor explains from this (docs/AI_TUTOR.md).
    results: jsonb('results').$type<TestResult[]>().notNull().default([]),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Serves "this user's latest submissions for this exercise".
  (t) => [
    index('submissions_user_exercise_time').on(
      t.userId,
      t.exerciseId,
      t.submittedAt.desc(),
    ),
  ],
).enableRLS();
