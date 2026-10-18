import { addDays, istDate, istWeekStart } from '../ist-calendar.js';
import { NO_STREAK, nextStreak, visibleStreak } from '../streak.js';

const at = (current: number, longest: number, lastActiveDate: string) => ({
  current,
  longest,
  lastActiveDate,
});

describe('nextStreak (FR-10)', () => {
  it.each([
    ['first lesson ever', NO_STREAK, at(1, 1, '2026-10-14')],
    ['same day again', at(3, 5, '2026-10-14'), at(3, 5, '2026-10-14')],
    ['next day', at(3, 5, '2026-10-13'), at(4, 5, '2026-10-14')],
    ['next day beats longest', at(5, 5, '2026-10-13'), at(6, 6, '2026-10-14')],
    ['one missed day', at(3, 5, '2026-10-12'), at(1, 5, '2026-10-14')],
    ['long gap', at(9, 9, '2026-01-01'), at(1, 9, '2026-10-14')],
    ['clock went backwards', at(2, 2, '2026-10-15'), at(2, 2, '2026-10-15')],
  ])('%s', (_case, prev, expected) => {
    expect(nextStreak(prev, '2026-10-14')).toEqual(expected);
  });

  it('crosses month and year ends', () => {
    expect(nextStreak(at(1, 1, '2026-12-31'), '2027-01-01').current).toBe(2);
    expect(nextStreak(at(1, 1, '2028-02-28'), '2028-02-29').current).toBe(2);
  });
});

describe('visibleStreak', () => {
  it.each([
    ['active today', '2026-10-14', 4],
    ['active yesterday (still alive)', '2026-10-13', 4],
    ['missed a day', '2026-10-12', 0],
  ])('%s', (_case, last, shown) => {
    expect(visibleStreak(at(4, 6, last), '2026-10-14')).toBe(shown);
  });

  it('is 0 with no activity', () => {
    expect(visibleStreak(NO_STREAK, '2026-10-14')).toBe(0);
  });
});

describe('IST calendar', () => {
  it.each([
    [
      '18:29 UTC is still the same IST day',
      '2026-10-14T18:29:59Z',
      '2026-10-14',
    ],
    ['18:30 UTC is midnight IST', '2026-10-14T18:30:00Z', '2026-10-15'],
    ['early UTC morning', '2026-10-14T00:00:00Z', '2026-10-14'],
  ])('istDate: %s', (_case, iso, day) => {
    expect(istDate(new Date(iso))).toBe(day);
  });

  it('addDays handles month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it.each([
    // 2026-10-12 is a Monday; its 00:00 IST is 2026-10-11T18:30Z.
    ['Monday 00:00 IST', '2026-10-11T18:30:00Z', '2026-10-11T18:30:00.000Z'],
    ['Wednesday', '2026-10-14T09:00:00Z', '2026-10-11T18:30:00.000Z'],
    ['Sunday 23:59 IST', '2026-10-18T18:29:00Z', '2026-10-11T18:30:00.000Z'],
    [
      'next Monday 00:00 IST',
      '2026-10-18T18:30:00Z',
      '2026-10-18T18:30:00.000Z',
    ],
  ])('istWeekStart: %s', (_case, iso, start) => {
    expect(istWeekStart(new Date(iso)).toISOString()).toBe(start);
  });
});
