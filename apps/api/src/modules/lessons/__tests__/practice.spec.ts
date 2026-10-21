import { PRACTICE_SIZE, pickPractice } from '../practice.js';

// A fixed sequence of "random" numbers in [0, 1).
const rolls = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('pickPractice (ADR-037)', () => {
  it('picks at most PRACTICE_SIZE items, each once', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i);
    const picked = pickPractice(pool);
    expect(picked).toHaveLength(PRACTICE_SIZE);
    expect(new Set(picked).size).toBe(PRACTICE_SIZE);
    expect(picked.every((p) => pool.includes(p))).toBe(true);
  });

  it('returns everything (in some order) when the pool is small', () => {
    expect(pickPractice(['a', 'b', 'c']).sort()).toEqual(['a', 'b', 'c']);
    expect(pickPractice([])).toEqual([]);
  });

  it('weighs older items more: a low roll lands on the oldest', () => {
    // Weights 3, 2, 1 (total 6): a roll of 0.4 * 6 = 2.4 falls in the
    // oldest item's share [0, 3).
    expect(pickPractice(['old', 'mid', 'new'], 1, rolls(0.4))).toEqual(['old']);
    // 0.9 * 6 = 5.4 falls in the newest item's share [5, 6).
    expect(pickPractice(['old', 'mid', 'new'], 1, rolls(0.9))).toEqual(['new']);
  });

  it('picks the oldest far more often than the newest over many runs', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i);
    const firsts = new Map<number, number>();
    for (let run = 0; run < 2000; run++) {
      const [first] = pickPractice(pool, 1);
      firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    // Weights 10 vs 1: expect about 364 vs 36.
    expect(firsts.get(0)!).toBeGreaterThan(5 * (firsts.get(9) ?? 0));
  });
});
