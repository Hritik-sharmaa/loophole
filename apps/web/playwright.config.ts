import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (ADR-034): the real web app, built for production, in
// Chromium, against e2e/mock-backend.mts (Supabase Auth, the REST API and
// the /duels socket). The API itself is tested on PGlite in apps/api/test.
const MOCK = 'http://localhost:4010';
const APP_PORT = 4020;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // The first lesson once more at phone size (ADR-022: phones first).
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
      testMatch: '**/first-lesson.e2e.ts',
    },
  ],
  webServer: [
    {
      command: 'node e2e/mock-backend.mts',
      url: `${MOCK}/health`,
      env: { MOCK_PORT: '4010' },
      reuseExistingServer: !!process.env.E2E_REUSE,
    },
    {
      // Its own dist folder: the normal `.next` keeps pointing at the real
      // API. E2E_REUSE=1 keeps a running app between local runs.
      command: `pnpm exec next build && pnpm exec next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      timeout: 300_000,
      env: {
        NEXT_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_API_URL: MOCK,
        NEXT_PUBLIC_SUPABASE_URL: MOCK,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key',
      },
      reuseExistingServer: !!process.env.E2E_REUSE,
    },
  ],
});
