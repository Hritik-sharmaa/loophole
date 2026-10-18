import { describe, expect, it } from 'vitest';
import {
  PATH_WIDTH,
  ROW_HEIGHT,
  donePointCount,
  improvedLessons,
  layoutNodes,
  pathThrough,
} from './path-geometry';

describe('layoutNodes', () => {
  it('zig-zags around the centre, one row apart', () => {
    const points = layoutNodes(3);
    expect(points.map((p) => p.x)).toEqual([150, 214, 246]);
    expect(points.map((p) => p.y)).toEqual([64, 192, 320]);
  });

  it('continues the zig-zag from startIndex, across units', () => {
    expect(layoutNodes(2, 6).map((p) => p.x)).toEqual([54, 86]);
    expect(layoutNodes(1, 8)[0].x).toBe(150); // the pattern repeats
  });

  it('keeps every node (64 px wide) inside the column', () => {
    for (const p of layoutNodes(16)) {
      expect(p.x - 32).toBeGreaterThanOrEqual(0);
      expect(p.x + 32).toBeLessThanOrEqual(PATH_WIDTH);
    }
    expect(ROW_HEIGHT).toBeGreaterThan(64);
  });
});

describe('pathThrough', () => {
  it('moves to the first point and curves to each next one', () => {
    expect(
      pathThrough([
        { x: 150, y: 64 },
        { x: 214, y: 192 },
      ]),
    ).toBe('M 150 64 C 150 128, 214 128, 214 192');
  });

  it('is empty for no points', () => {
    expect(pathThrough([])).toBe('');
  });
});

describe('donePointCount', () => {
  it.each([
    ['active first', ['active', 'locked', 'locked'], 1],
    ['active in the middle', ['completed', 'active', 'locked'], 2],
    ['all completed', ['completed', 'completed'], 2],
    ['all locked', ['locked', 'locked'], 0],
    ['empty unit', [], 0],
  ] as const)('%s', (_case, states, expected) => {
    expect(donePointCount(states)).toBe(expected);
  });
});

describe('improvedLessons', () => {
  it('is empty on a first visit', () => {
    expect(improvedLessons(null, { a: 'completed' }).size).toBe(0);
  });

  it('finds lessons that moved forward only', () => {
    const before = {
      a: 'active',
      b: 'locked',
      c: 'completed',
      d: 'locked',
    } as const;
    const now = {
      a: 'completed',
      b: 'active',
      c: 'completed',
      d: 'locked',
      e: 'active',
    } as const;
    // e is new (no previous state), so it does not pop.
    expect([...improvedLessons(before, now)].sort()).toEqual(['a', 'b']);
  });
});
