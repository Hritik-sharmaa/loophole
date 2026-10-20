import { describe, expect, it } from 'vitest';
import { formatDuration, nextIstMidnight } from './format-time';

describe('formatDuration', () => {
  it('shows seconds, minutes and hours compactly', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(210_000)).toBe('3m 30s');
    expect(formatDuration(65_000)).toBe('1m 05s');
    expect(formatDuration(3_720_000)).toBe('1h 02m');
  });

  it('never shows a negative time', () => {
    expect(formatDuration(-5_000)).toBe('0s');
  });
});

describe('nextIstMidnight', () => {
  it('is 00:00 IST the next day, which is 18:30 UTC the same day', () => {
    expect(nextIstMidnight('2026-10-20').toISOString()).toBe(
      '2026-10-20T18:30:00.000Z',
    );
    expect(nextIstMidnight('2026-12-31').toISOString()).toBe(
      '2026-12-31T18:30:00.000Z',
    );
  });
});
