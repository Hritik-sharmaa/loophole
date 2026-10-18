import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // NestJS loads reflect-metadata at startup; tests that skip Nest need it too.
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Each file's beforeAll starts PGlite, runs every migration, seeds the
    // content and boots Nest. With all files in parallel on a busy machine
    // that passed the default 10 s and failed whole files.
    hookTimeout: 60_000,
    // e2e tests boot the whole AppModule, so they need a valid env even in CI
    // where there is no .env file.
    // Dummy values: postgres-js connects lazily and the Supabase client is
    // stubbed, so nothing here is ever contacted.
    env: {
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/postgres',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      // PistonClient is stubbed in tests, so this is never called either.
      PISTON_URL: 'http://localhost:2000',
      // GeminiClient is stubbed in tests too.
      GEMINI_API_KEY: 'test-gemini-key',
    },
  },
});
