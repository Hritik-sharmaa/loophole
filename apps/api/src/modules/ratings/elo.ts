// Elo ratings for duels (FR-24, ADR-012).

export const K_FACTOR = 32;
export const STARTING_ELO = 1200;

// A's chance of beating B, from 0 to 1: 0.5 for equal ratings, and about
// 0.76 when A is 200 points higher.
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

// Rating changes after one duel. scoreA is 1 if A won, 0 if A lost, 0.5 for
// a draw. B's change is the exact opposite of A's, so no points are created
// or lost: rounding each side separately could drift by 1.
export function eloChanges(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 0.5 | 1,
): { a: number; b: number } {
  const a = Math.round(K_FACTOR * (scoreA - expectedScore(ratingA, ratingB)));
  // `+ 0` turns -0 into 0, so a zero change is always plain 0.
  return { a: a + 0, b: -a + 0 };
}
