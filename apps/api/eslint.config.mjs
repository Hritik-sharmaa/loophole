// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'eslint.config.mjs']),
  eslint.configs.recommended,
  // "TypeChecked" rules read the real types, so they catch things like
  // forgotten `await`s (no-floating-promises) that syntax-only rules miss.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Turns off style rules that would fight Prettier; keep this last.
  prettier,
]);
