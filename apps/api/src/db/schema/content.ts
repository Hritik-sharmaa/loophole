import type {
  GitScenario,
  LessonLearn,
  TestCase,
  WebCheck,
} from '@loophole/shared';
import {
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Course content, loaded from content/ by the seed script
// (docs/DATA_MODEL.md, docs/CONTENT_GUIDE.md). RLS on with no policies on
// every table: the browser's anon key can read none of it, hidden tests
// included. The API reads it as the database owner.

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  // Piston language name, e.g. "python".
  language: text('language').notNull(),
  title: text('title').notNull(),
  // One or two sentences for the course catalog (ADR-023).
  description: text('description').notNull().default(''),
}).enableRLS();

export const units = pgTable(
  'units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    unique('units_course_slug').on(t.courseId, t.slug),
    unique('units_course_position').on(t.courseId, t.position),
  ],
).enableRLS();

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    // The Learn step's cards and quick check (ADR-021). Null for a lesson
    // that goes straight to the exercise.
    learn: jsonb('learn').$type<LessonLearn>(),
  },
  (t) => [
    unique('lessons_unit_slug').on(t.unitId, t.slug),
    unique('lessons_unit_position').on(t.unitId, t.position),
  ],
).enableRLS();

// One exercise per lesson in v1. hidden_tests must never be selected into an
// API response (AGENTS.md hard rule 2).
export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  starterCode: text('starter_code').notNull(),
  sampleTests: jsonb('sample_tests').$type<TestCase[]>().notNull(),
  hiddenTests: jsonb('hidden_tests').$type<TestCase[]>().notNull(),
  // Web exercises only (ADR-024): the page's rules, all shown to the
  // learner. Null for program exercises, whose tests are above.
  checks: jsonb('checks').$type<WebCheck[]>(),
  // Git exercises only (ADR-026): hidden setup commands and the checks on
  // the simulated repository. Null for every other kind.
  gitScenario: jsonb('git_scenario').$type<GitScenario>(),
}).enableRLS();
