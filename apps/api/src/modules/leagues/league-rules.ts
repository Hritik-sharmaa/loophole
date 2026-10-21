import type { LeagueZone } from '@loophole/shared';

// Weekly leagues (ADR-038): the rules, kept pure so they are easy to test.

export const TIERS = ['Bronze', 'Silver', 'Gold', 'Diamond'] as const;
export const TOP_TIER = TIERS.length - 1;

// A group holds at most this many learners.
export const GROUP_SIZE = 20;
// At most this many move up (and down) per group each week.
export const MAX_ZONE = 5;
// Smaller groups demote nobody: with few learners, a bad week shouldn't
// drop anyone.
export const MIN_SIZE_TO_DEMOTE = 10;

export type Standing = { userId: string; xp: number; joinedAt: Date };

// Highest XP first; on a tie, whoever joined the group first.
export function rankStandings<T extends Standing>(members: T[]): T[] {
  return [...members].sort(
    (a, b) => b.xp - a.xp || a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
}

// How many move up, and down, in a group of `size`: a quarter of the group
// (rounded up), at most MAX_ZONE. A group of 3 promotes 1; of 20, 5.
export function zoneSizes(
  size: number,
  tier: number,
): { up: number; down: number } {
  const zone = Math.min(MAX_ZONE, Math.ceil(size / 4));
  return {
    up: tier < TOP_TIER ? zone : 0,
    down: tier > 0 && size >= MIN_SIZE_TO_DEMOTE ? zone : 0,
  };
}

// Where the learner at `rank` (1-based) ends the week.
export function zoneOf(rank: number, size: number, tier: number): LeagueZone {
  const { up, down } = zoneSizes(size, tier);
  if (rank <= up) return 'up';
  if (rank > size - down) return 'down';
  return 'stay';
}

export function nextTier(tier: number, zone: LeagueZone): number {
  if (zone === 'up') return Math.min(TOP_TIER, tier + 1);
  if (zone === 'down') return Math.max(0, tier - 1);
  return tier;
}
