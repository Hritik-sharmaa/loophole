import {
  TOP_TIER,
  nextTier,
  rankStandings,
  zoneOf,
  zoneSizes,
} from '../league-rules.js';

const at = (minute: number) => new Date(Date.UTC(2026, 9, 19, 0, minute));

describe('league rules (ADR-038)', () => {
  it('ranks by XP, and a tie goes to whoever joined first', () => {
    const ranked = rankStandings([
      { userId: 'late', xp: 20, joinedAt: at(5) },
      { userId: 'top', xp: 40, joinedAt: at(9) },
      { userId: 'early', xp: 20, joinedAt: at(1) },
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(['top', 'early', 'late']);
  });

  it('moves a quarter of the group, at most 5', () => {
    expect(zoneSizes(1, 0)).toEqual({ up: 1, down: 0 });
    expect(zoneSizes(3, 1)).toEqual({ up: 1, down: 0 });
    expect(zoneSizes(12, 1)).toEqual({ up: 3, down: 3 });
    expect(zoneSizes(20, 1)).toEqual({ up: 5, down: 5 });
  });

  it('demotes nobody in a group under 10, or from Bronze', () => {
    expect(zoneSizes(9, 2).down).toBe(0);
    expect(zoneSizes(20, 0).down).toBe(0);
  });

  it('promotes nobody from the top tier', () => {
    expect(zoneSizes(20, TOP_TIER).up).toBe(0);
  });

  it('puts each rank in its zone', () => {
    // 20 in Silver: 1–5 up, 6–15 stay, 16–20 down.
    expect(zoneOf(5, 20, 1)).toBe('up');
    expect(zoneOf(6, 20, 1)).toBe('stay');
    expect(zoneOf(15, 20, 1)).toBe('stay');
    expect(zoneOf(16, 20, 1)).toBe('down');
    // Alone in Bronze: up.
    expect(zoneOf(1, 1, 0)).toBe('up');
  });

  it('moves one tier at a time, within Bronze to Diamond', () => {
    expect(nextTier(0, 'up')).toBe(1);
    expect(nextTier(0, 'down')).toBe(0);
    expect(nextTier(TOP_TIER, 'up')).toBe(TOP_TIER);
    expect(nextTier(2, 'down')).toBe(1);
    expect(nextTier(2, 'stay')).toBe(2);
  });
});
