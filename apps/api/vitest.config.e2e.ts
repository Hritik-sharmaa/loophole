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
    // e2e tests boot the whole AppModule, so they need a valid env even in CI
    // where there is no .env file.
    env: {
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
