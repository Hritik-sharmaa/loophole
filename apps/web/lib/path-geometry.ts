import type { LessonState } from '@loophole/shared';

// Geometry for the hand-built lesson path (DESIGN_SYSTEM §6 LessonPath):
// nodes zig-zag down a fixed-width column, joined by S-curves. Pure
// functions, so they are unit-tested and shared with the landing preview.

export type Point = { x: number; y: number };

// Fits a phone (390 px screen minus the 24 px gutters) with room to spare.
export const PATH_WIDTH = 300;
// Vertical distance between nodes: 64 px node + label + breathing room.
export const ROW_HEIGHT = 128;
const CENTER = PATH_WIDTH / 2;
// Sideways offsets from the centre, repeating every eight nodes.
const ZIGZAG = [0, 64, 96, 64, 0, -64, -96, -64];

// Centres of `count` nodes. `startIndex` is the first node's place in the
// whole course, so the zig-zag carries on across units.
export function layoutNodes(count: number, startIndex = 0): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: CENTER + ZIGZAG[(startIndex + i) % ZIGZAG.length],
    y: ROW_HEIGHT / 2 + i * ROW_HEIGHT,
  }));
}

export function pathHeight(count: number): number {
  return count * ROW_HEIGHT;
}

// An SVG path through the points: vertical S-curves between neighbours.
export function pathThrough(points: readonly Point[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    })
    .join(' ');
}

// How many of a unit's nodes the Ink (done) part of the path runs through:
// up to and including the active node, all of them once the unit is
// finished, none if it is still locked.
export function donePointCount(states: readonly LessonState[]): number {
  const active = states.indexOf('active');
  if (active >= 0) return active + 1;
  return states.length > 0 && states.every((s) => s === 'completed')
    ? states.length
    : 0;
}

const ORDER: Record<LessonState, number> = {
  locked: 0,
  active: 1,
  completed: 2,
};

// Lessons whose state moved forward since the last visit (locked → active,
// active → completed): these get the unlock pop. Nothing pops on a first
// visit (no previous states), so a normal page load stays still.
export function improvedLessons(
  previous: Readonly<Record<string, LessonState>> | null,
  current: Readonly<Record<string, LessonState>>,
): Set<string> {
  const improved = new Set<string>();
  if (!previous) return improved;
  for (const [id, state] of Object.entries(current)) {
    const before = previous[id];
    if (before !== undefined && ORDER[state] > ORDER[before]) improved.add(id);
  }
  return improved;
}
