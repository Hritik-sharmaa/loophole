import {
  BOT_OPPONENTS,
  BOT_PACE_MS,
  PACE_JITTER_MS,
  botFinishAt,
  botSchedule,
} from '../bot-duel-rules.js';
import { DUEL_DURATION_MS } from '../../duels/duel-rules.js';

// A fixed "random" source for repeatable schedules.
const always = (n: number) => () => n;

describe('botSchedule', () => {
  it('has one time per test, never decreasing, ending at the finish', () => {
    const times = botSchedule('arjun', 5, always(0.5));
    expect(times).toHaveLength(5);
    expect(times.at(-1)).toBe(BOT_PACE_MS.arjun);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });

  it('passes nothing while the bot is still reading the code', () => {
    const [first] = botSchedule('harpreet', 5, always(0));
    const finish = BOT_PACE_MS.harpreet - PACE_JITTER_MS;
    expect(first).toBeGreaterThanOrEqual(finish * 0.3);
  });

  it('moves the finish by at most the jitter', () => {
    expect(botSchedule('meera', 4, always(0)).at(-1)).toBe(
      BOT_PACE_MS.meera - PACE_JITTER_MS,
    );
    expect(botSchedule('meera', 4, always(0.999999)).at(-1)).toBe(
      BOT_PACE_MS.meera + PACE_JITTER_MS,
    );
  });

  it('every bot finishes inside the duel, Meera slowest, Harpreet fastest', () => {
    for (const bot of BOT_OPPONENTS) {
      expect(BOT_PACE_MS[bot] + PACE_JITTER_MS).toBeLessThan(DUEL_DURATION_MS);
    }
    expect(BOT_PACE_MS.meera).toBeGreaterThan(BOT_PACE_MS.arjun);
    expect(BOT_PACE_MS.arjun).toBeGreaterThan(BOT_PACE_MS.harpreet);
  });

  it('with random times, stays ordered', () => {
    for (let run = 0; run < 200; run++) {
      const times = botSchedule('arjun', 6);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });
});

describe('botFinishAt', () => {
  it('is the start plus the last scheduled time', () => {
    const start = new Date('2026-10-21T10:00:00Z');
    expect(botFinishAt(start, [1000, 2000, 90_000]).toISOString()).toBe(
      '2026-10-21T10:01:30.000Z',
    );
  });
});
