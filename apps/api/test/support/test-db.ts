import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { resolve } from 'node:path';
import type { Db } from '../../src/db/db.service.js';
import * as schema from '../../src/db/schema/index.js';
import { profiles } from '../../src/db/schema/index.js';

export const MIGRATIONS_DIR = resolve(
  import.meta.dirname,
  '../../src/db/migrations',
);
export const CONTENT_DIR = resolve(import.meta.dirname, '../../../../content');

export type TestDb = { db: Db; close: () => Promise<void> };

// A real, in-memory Postgres (PGlite) with our real migrations applied.
// No Docker and no Supabase: Supabase's auth.users is stubbed with the one
// column our foreign keys point at.
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await client.exec(
    'create schema auth; create table auth.users (id uuid primary key);',
  );
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db, close: () => client.close() };
}

// Inserts a Supabase user and their profile, as S1's first request would.
export async function createTestUser(
  db: Db,
  id: string,
  username = 'tester',
): Promise<void> {
  await db.execute(`insert into auth.users (id) values ('${id}')`);
  await db.insert(profiles).values({ id, username });
}
