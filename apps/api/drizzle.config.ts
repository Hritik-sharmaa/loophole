import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Nest, so load apps/api/.env here.
// `generate` works without it; `migrate` needs DATABASE_URL.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  // Only manage our tables; Supabase owns the auth schema.
  schemaFilter: ['public'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
