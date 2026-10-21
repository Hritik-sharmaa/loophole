import type {
  DuelReplayEvent,
  DuelResultKind,
  MyDuelOutcome,
} from '@loophole/shared';

// Duel replays (FR-27, ADR-041): pure helpers, unit-tested.

// How a finished duel went for `userId`.
export function outcomeFor(
  duel: { result: DuelResultKind | null; winnerId: string | null },
  userId: string,
): MyDuelOutcome {
  if (duel.result === 'draw' || duel.winnerId === null) return 'draw';
  return duel.winnerId === userId ? 'won' : 'lost';
}

export type GradedAttempt = {
  userId: string;
  code: string;
  testsPassed: number;
  totalTests: number;
  submittedAt: Date;
};

// The replay's timeline, oldest first. Only the caller's own attempts
// carry code: the opponent's fix stays on the server (hard rule 2). A
// submission saved just after the end (graded while the duel finished)
// is placed at the end.
export function replayEvents(
  attempts: readonly GradedAttempt[],
  me: string,
  startedAt: Date,
  durationMs: number,
): DuelReplayEvent[] {
  return [...attempts]
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
    .map((a) => {
      const mine = a.userId === me;
      return {
        atMs: Math.min(
          durationMs,
          Math.max(0, a.submittedAt.getTime() - startedAt.getTime()),
        ),
        who: mine ? 'me' : 'opponent',
        testsPassed: a.testsPassed,
        totalTests: a.totalTests,
        code: mine ? a.code : null,
      };
    });
}
