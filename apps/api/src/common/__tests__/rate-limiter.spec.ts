import { RateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  it('allows `limit` hits per window, then refuses', () => {
    const limiter = new RateLimiter(3, 1000);
    expect([0, 10, 20, 30].map((t) => limiter.hit('a', t))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('slides: old hits stop counting once out of the window', () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.hit('a', 0);
    limiter.hit('a', 500);
    expect(limiter.hit('a', 999)).toBe(false);
    expect(limiter.hit('a', 1000)).toBe(true); // the hit at 0 has expired
    expect(limiter.hit('a', 1200)).toBe(false);
  });

  it('counts each key separately', () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('b', 0)).toBe(true);
    expect(limiter.hit('a', 1)).toBe(false);
  });

  it('forgets keys with no hit in the last window', () => {
    const limiter = new RateLimiter(5, 1000);
    limiter.hit('gone', 0);
    limiter.hit('stays', 500);
    expect(limiter.size).toBe(2);
    limiter.hit('stays', 1200); // a sweep: 'gone' was last seen 1200 ms ago
    expect(limiter.size).toBe(1);
  });

  it('a refused hit does not extend the wait', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.hit('a', 0);
    limiter.hit('a', 900); // refused, not recorded
    expect(limiter.hit('a', 1000)).toBe(true);
  });
});
