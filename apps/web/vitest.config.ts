import { defineConfig } from 'vitest/config';

// Unit tests for the web app's pure logic (lib/*.test.ts). Node environment:
// these tests touch no DOM.
export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
