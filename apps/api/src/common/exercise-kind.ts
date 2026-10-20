import type { ExerciseKind } from '@loophole/shared';

// Course languages whose exercises are web pages, checked by rules instead
// of run in Piston (ADR-024). Every other language is a Piston runtime.
const WEB_LANGUAGES = new Set(['html']);

export function exerciseKind(language: string): ExerciseKind {
  return WEB_LANGUAGES.has(language) ? 'web' : 'program';
}
