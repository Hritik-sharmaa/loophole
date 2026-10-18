import { addDays } from '../../common/ist-calendar.js';

// A user's stored streak. Dates are IST calendar days, "YYYY-MM-DD".
export type StreakState = {
  current: number;
  longest: number;
  lastActiveDate: string | null;
};

export const NO_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
};

// FR-10 (basic; freezes come in Phase 3). Called when the user completes a
// new lesson on `today`: the same day changes nothing, the next day extends
// the streak, and any gap starts it again at 1.
export function nextStreak(prev: StreakState, today: string): StreakState {
  const last = prev.lastActiveDate;
  // Already counted today (or a clock went backwards): nothing to add.
  if (last !== null && last >= today) return prev;

  const current = last === addDays(today, -1) ? prev.current + 1 : 1;
  return {
    current,
    longest: Math.max(prev.longest, current),
    lastActiveDate: today,
  };
}

// The streak to show on `today`. The stored count goes stale once a day is
// missed, so it only counts while the last active day is today or yesterday.
export function visibleStreak(state: StreakState, today: string): number {
  const last = state.lastActiveDate;
  return last === today || last === addDays(today, -1) ? state.current : 0;
}
