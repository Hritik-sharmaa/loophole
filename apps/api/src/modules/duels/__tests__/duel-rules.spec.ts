import { ConflictException } from '@nestjs/common';
import {
  assertTransition,
  canTransition,
  timeoutOutcome,
  type DuelPhase,
} from '../duel-rules.js';

const PHASES: DuelPhase[] = ['waiting', 'matched', 'in_progress', 'completed'];
const LEGAL = new Set([
  'waiting→matched',
  'matched→in_progress',
  'in_progress→completed',
]);

describe('canTransition (FR-25)', () => {
  // Every pair of phases: the three legal steps and all 13 illegal ones.
  const pairs = PHASES.flatMap((from) =>
    PHASES.map((to) => [from, to, LEGAL.has(`${from}→${to}`)] as const),
  );

  it.each(pairs)('%s → %s is %s', (from, to, legal) => {
    expect(canTransition(from, to)).toBe(legal);
  });

  it('covers all 16 pairs', () => {
    expect(pairs).toHaveLength(16);
  });
});

describe('assertTransition', () => {
  it('passes for a legal step', () => {
    expect(() => assertTransition('in_progress', 'completed')).not.toThrow();
  });

  it('throws 409 ILLEGAL_TRANSITION for an illegal one', () => {
    try {
      assertTransition('completed', 'in_progress');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      });
    }
  });
});

describe('timeoutOutcome (FR-22)', () => {
  const a = (best: number) => ({ id: 'a', best });
  const b = (best: number) => ({ id: 'b', best });

  it.each([
    ['A passed more', a(3), b(1), { result: 'win', winnerId: 'a' }],
    ['B passed more', a(0), b(2), { result: 'win', winnerId: 'b' }],
    ['equal is a draw', a(2), b(2), { result: 'draw', winnerId: null }],
    ['nobody submitted', a(0), b(0), { result: 'draw', winnerId: null }],
  ])('%s', (_case, playerA, playerB, expected) => {
    expect(timeoutOutcome(playerA, playerB)).toEqual(expected);
  });
});
