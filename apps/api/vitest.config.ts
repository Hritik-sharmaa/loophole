import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // NestJS loads reflect-metadata at startup; tests that skip Nest need it too.
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['**/*.spec.ts'],
  },
});
