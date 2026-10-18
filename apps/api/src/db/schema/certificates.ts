import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { courses } from './content.js';
import { profiles } from './profiles.js';

// One certificate per user per finished course (FR-15, docs/DATA_MODEL.md).
// public_slug is the shareable /c/<slug> address: random, so certificates
// can't be listed by guessing.
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    publicSlug: text('public_slug').notNull().unique(),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Issuing is idempotent: a second completion can't create a second one.
  (t) => [unique('certificates_once_per_course').on(t.userId, t.courseId)],
).enableRLS();
