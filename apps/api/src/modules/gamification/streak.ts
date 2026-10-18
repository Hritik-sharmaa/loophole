import { daysBetween } from '../../common/ist-calendar.js';

// A user's stored streak. Dates are IST calendar days, "YYYY-MM-DD".
export type StreakState = {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  // Streak freezes in hand (FR-10): each covers one missed day.
  freezes: number;
};

export const NO_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
  freezes: 0,
};

// ADR-012: one freeze per 7 days of streak, at most 2 in hand.
export const DAYS_PER_FREEZE = 7;
export const MAX_FREEZES = 2;

// Days missed between the last active day and `today` (0 if active today
// or yesterday).
function missedDays(last: string, today: string): number {
  return Math.max(0, daysBetween(last, today) - 1);
}

// FR-10. Called when the user completes a new lesson on `today`:
// - the same day changes nothing;
// - the next day extends the streak;
// - after missed days, each missed day uses a freeze and the streak goes
//   on; if there are not enough freezes, it starts again at 1 and the
//   freezes are kept (they could not save it);
// - every 7th day of a streak earns a freeze, up to 2.
export function nextStreak(prev: StreakState, today: string): StreakState {
  const last = prev.lastActiveDate;
  // Already counted today (or a clock went backwards): nothing to add.
  if (last !== null && last >= today) return prev;

  const missed = last === null ? 0 : missedDays(last, today);
  const saved = last !== null && missed <= prev.freezes;
  const current = saved ? prev.current + 1 : 1;
  let freezes = saved ? prev.freezes - missed : prev.freezes;
  if (current % DAYS_PER_FREEZE === 0) {
    freezes = Math.min(MAX_FREEZES, freezes + 1);
  }

  return {
    current,
    longest: Math.max(prev.longest, current),
    lastActiveDate: today,
    freezes,
  };
}

// The streak to show on `today`: alive while the freezes in hand still
// cover every missed day (they are spent when the next lesson is done).
export function visibleStreak(state: StreakState, today: string): number {
  const last = state.lastActiveDate;
  if (last === null) return 0;
  return missedDays(last, today) <= state.freezes ? state.current : 0;
}
