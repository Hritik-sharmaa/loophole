// Calendar days and weeks in India Standard Time, which streaks and the
// weekly board use (docs/DATA_MODEL.md, ADR-012). IST is UTC+5:30 all year
// (no daylight saving), so a fixed offset is exact.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// "YYYY-MM-DD" of the IST calendar day that `now` falls in.
export function istDate(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// The "YYYY-MM-DD" day `days` after (or before, if negative) `date`.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The instant the current IST week began: Monday 00:00 IST (FR-11).
export function istWeekStart(now: Date): Date {
  const today = istDate(now);
  // getUTCDay on the date string: 0 = Sunday … 6 = Saturday.
  const daysSinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return new Date(`${addDays(today, -daysSinceMonday)}T00:00:00+05:30`);
}

// Whole days from `from` to `to` ("YYYY-MM-DD"): 1 for consecutive days,
// negative if `to` is earlier.
export function daysBetween(from: string, to: string): number {
  const ms =
    new Date(`${to}T00:00:00Z`).getTime() -
    new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}
