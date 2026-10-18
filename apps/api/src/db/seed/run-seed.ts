import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.js';
import { seedContent } from './seed-content.js';

// CLI entry for `pnpm --filter @loophole/api db:seed`. Runs from apps/api,
// outside Nest, so it reads .env itself.
async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (apps/api/.env)');

  const contentDir = resolve(process.cwd(), '../../content');
  const client = postgres(url, { prepare: false, max: 1 });
  try {
    const summary = await seedContent(drizzle(client, { schema }), contentDir);
    console.log(
      `Seeded ${summary.courses} course(s), ${summary.units} unit(s), ${summary.lessons} lesson(s), ${summary.duelProblems} duel problem(s) from ${contentDir}`,
    );
    if (summary.stale.length > 0) {
      console.warn(
        `Not in content/ any more (left in the database):\n  ${summary.stale.join('\n  ')}`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
