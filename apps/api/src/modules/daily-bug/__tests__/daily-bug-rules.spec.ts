import {
  dailyPick,
  rankSolves,
  solveTimeMs,
  type Solve,
} from '../daily-bug-rules.js';

describe('dailyPick', () => {
  it('gives everyone the same problem on the same day', () => {
    expect(dailyPick('2026-10-20', 15)).toBe(dailyPick('2026-10-20', 15));
  });

  it('moves on one problem a day and wraps round', () => {
    const picks = Array.from({ length: 16 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 9, 20 + i));
      return dailyPick(d.toISOString().slice(0, 10), 15);
    });
    // 15 days in a row show all 15 problems once...
    expect(new Set(picks.slice(0, 15)).size).toBe(15);
    // ...and day 16 starts again.
    expect(picks[15]).toBe(picks[0]);
    for (let i = 1; i < 15; i++) {
      expect(picks[i]).toBe((picks[i - 1] + 1) % 15);
    }
  });

  it('stays in range before the rotation starts', () => {
    const pick = dailyPick('2025-12-25', 15);
    expect(pick).toBeGreaterThanOrEqual(0);
    expect(pick).toBeLessThan(15);
  });

  it('refuses an empty pool', () => {
    expect(() => dailyPick('2026-10-20', 0)).toThrow(/at least one/);
  });
});

describe('solveTimeMs', () => {
  it('is the time from opening to solving, never negative', () => {
    const opened = new Date('2026-10-20T10:00:00Z');
    expect(solveTimeMs(opened, new Date('2026-10-20T10:02:30Z'))).toBe(150_000);
    expect(solveTimeMs(opened, new Date('2026-10-20T09:59:00Z'))).toBe(0);
  });
});

describe('rankSolves', () => {
  const at = (hh: string) => new Date(`2026-10-20T${hh}:00Z`);
  const solve = (
    username: string,
    opened: string,
    solved: string,
    attempts = 1,
  ): Solve => ({
    userId: `id-${username}`,
    username,
    openedAt: at(opened),
    solvedAt: at(solved),
    attempts,
  });

  it('puts the fastest solve first, whenever it started', () => {
    const ranked = rankSolves([
      solve('slow', '09:00', '09:30'),
      solve('quick', '18:00', '18:05'),
      solve('mid', '07:00', '07:10'),
    ]);
    expect(ranked.map((r) => [r.rank, r.username, r.timeMs])).toEqual([
      [1, 'quick', 300_000],
      [2, 'mid', 600_000],
      [3, 'slow', 1_800_000],
    ]);
  });

  it('on an equal time, whoever finished first is ahead, then by name', () => {
    const ranked = rankSolves([
      solve('zed', '10:00', '10:05'),
      solve('bea', '11:00', '11:05'),
      solve('amy', '10:00', '10:05'),
    ]);
    expect(ranked.map((r) => r.username)).toEqual(['amy', 'zed', 'bea']);
  });

  it('keeps the number of attempts', () => {
    expect(rankSolves([solve('ada', '10:00', '10:01', 4)])[0].attempts).toBe(4);
  });
});
