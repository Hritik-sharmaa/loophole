// "3m 30s", "45s", "1h 02m": a solve time or a countdown, short.
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

// The instant the IST day after `day` ("YYYY-MM-DD") begins: when the next
// bug of the day arrives.
export function nextIstMidnight(day: string): Date {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00+05:30`);
}
