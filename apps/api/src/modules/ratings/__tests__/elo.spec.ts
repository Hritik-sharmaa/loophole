import { eloChanges, expectedScore } from '../elo.js';

describe('expectedScore', () => {
  it.each([
    [1200, 1200, 0.5],
    [1400, 1200, 0.76],
    [1200, 1400, 0.24],
    [1600, 1200, 0.91],
  ])('%i vs %i ≈ %f', (rating, opponent, expected) => {
    expect(expectedScore(rating, opponent)).toBeCloseTo(expected, 2);
  });

  it('two players’ chances add up to 1', () => {
    expect(expectedScore(1337, 1210) + expectedScore(1210, 1337)).toBeCloseTo(
      1,
      10,
    );
  });
});

describe('eloChanges (K = 32)', () => {
  it.each([
    ['equal ratings, A wins', 1200, 1200, 1, { a: 16, b: -16 }],
    ['equal ratings, A loses', 1200, 1200, 0, { a: -16, b: 16 }],
    ['equal ratings, draw', 1200, 1200, 0.5, { a: 0, b: 0 }],
    ['favourite wins: small gain', 1400, 1200, 1, { a: 8, b: -8 }],
    ['underdog wins: big gain', 1200, 1400, 1, { a: 24, b: -24 }],
    ['draw against a stronger player gains', 1200, 1400, 0.5, { a: 8, b: -8 }],
    ['huge gap, favourite wins: almost nothing', 2000, 1200, 1, { a: 0, b: 0 }],
  ] as const)('%s', (_case, ratingA, ratingB, scoreA, expected) => {
    expect(eloChanges(ratingA, ratingB, scoreA)).toEqual(expected);
  });

  it('never creates or destroys points', () => {
    for (let a = 800; a <= 2000; a += 37) {
      for (const score of [0, 0.5, 1] as const) {
        const { a: da, b: db } = eloChanges(a, 1200, score);
        expect(da + db).toBe(0);
      }
    }
  });

  it('a zero change is 0, not -0', () => {
    expect(Object.is(eloChanges(2000, 1200, 1).b, 0)).toBe(true);
  });
});
