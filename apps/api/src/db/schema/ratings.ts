import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

// One row per user who has finished a duel (docs/DATA_MODEL.md, S8).
// No row means the starting rating, 1200 (ADR-012).
export const ratings = pgTable('ratings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  elo: integer('elo').notNull().default(1200),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();
