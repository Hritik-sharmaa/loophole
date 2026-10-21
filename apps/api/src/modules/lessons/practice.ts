// The practice stop (ADR-037): which questions to bring back. A light
// spaced repetition: every quick check and bug card from the lessons the
// learner has finished can come up, but the longer ago a lesson was
// finished, the more likely its questions are picked.

export const PRACTICE_SIZE = 8;

// `pool` is ordered from the lesson finished longest ago to the newest.
// Item i weighs (pool.length - i), so the oldest weighs the most and the
// newest still weighs 1. Weighted sampling without replacement; `random`
// is injectable for tests.
export function pickPractice<T>(
  pool: T[],
  size = PRACTICE_SIZE,
  random: () => number = Math.random,
): T[] {
  const left = pool.map((item, i) => ({ item, weight: pool.length - i }));
  const picked: T[] = [];
  while (picked.length < size && left.length > 0) {
    const total = left.reduce((sum, c) => sum + c.weight, 0);
    let roll = random() * total;
    let at = 0;
    while (at < left.length - 1 && roll >= left[at].weight) {
      roll -= left[at].weight;
      at++;
    }
    picked.push(left[at].item);
    left.splice(at, 1);
  }
  return picked;
}
