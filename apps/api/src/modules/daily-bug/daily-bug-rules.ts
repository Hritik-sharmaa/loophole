import { daysBetween } from '../../common/ist-calendar.js';

// Bug of the day (ADR-035): the pure rules, kept apart so they can be
// unit-tested without a database.

// Day 0 of the rotation. Any fixed day works; changing it reshuffles.
const ROTATION_START = '2026-01-01';

// Which of `count` problems (in slug order) is the bug of `day`: one after
// another, a new one each IST day, wrapping round. Everyone gets the same
// one on the same day. Adding a problem to the pool shifts the rotation
// from the next day on (today's players keep the bug they opened).
export function dailyPick(day: string, count: number): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`dailyPick needs at least one problem, got ${count}`);
  }
  const offset = daysBetween(ROTATION_START, day) % count;
  // Days before the start give a negative remainder.
  return (offset + count) % count;
}

// How long a solve took: from opening the bug to the first passing
// submission, both server times. Never negative.
export function solveTimeMs(openedAt: Date, solvedAt: Date): number {
  return Math.max(0, solvedAt.getTime() - openedAt.getTime());
}

export type Solve = {
  userId: string;
  username: string;
  openedAt: Date;
  solvedAt: Date;
  attempts: number;
};

export type RankedSolve = {
  rank: number;
  userId: string;
  username: string;
  timeMs: number;
  attempts: number;
};

// Today's board: fastest first. On an equal time, whoever finished first
// is ahead, then the username, so the order never depends on the database.
export function rankSolves(solves: readonly Solve[]): RankedSolve[] {
  return solves
    .map((s) => ({ ...s, timeMs: solveTimeMs(s.openedAt, s.solvedAt) }))
    .sort(
      (a, b) =>
        a.timeMs - b.timeMs ||
        a.solvedAt.getTime() - b.solvedAt.getTime() ||
        a.username.localeCompare(b.username),
    )
    .map(({ userId, username, timeMs, attempts }, i) => ({
      rank: i + 1,
      userId,
      username,
      timeMs,
      attempts,
    }));
}
