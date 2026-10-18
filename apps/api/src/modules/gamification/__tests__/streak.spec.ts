import {
  addDays,
  daysBetween,
  istDate,
  istWeekStart,
} from '../../../common/ist-calendar.js';
import { NO_STREAK, nextStreak, visibleStreak } from '../streak.js';

// current, longest, last active day, freezes
const at = (
  current: number,
  longest: number,
  lastActiveDate: string,
  freezes = 0,
) => ({ current, longest, lastActiveDate, freezes });

const TODAY = '2026-10-14';

describe('nextStreak (FR-10)', () => {
  it.each([
    ['first lesson ever', NO_STREAK, at(1, 1, TODAY)],
    ['same day again', at(3, 5, TODAY), at(3, 5, TODAY)],
    ['next day', at(3, 5, '2026-10-13'), at(4, 5, TODAY)],
    ['next day beats longest', at(5, 5, '2026-10-13'), at(6, 6, TODAY)],
    ['one missed day, no freeze', at(3, 5, '2026-10-12'), at(1, 5, TODAY)],
    ['long gap', at(9, 9, '2026-01-01'), at(1, 9, TODAY)],
    ['clock went backwards', at(2, 2, '2026-10-15'), at(2, 2, '2026-10-15')],
  ])('%s', (_case, prev, expected) => {
    expect(nextStreak(prev, TODAY)).toEqual(expected);
  });

  it.each([
    [
      'one missed day with a freeze: the streak goes on, the freeze is used',
      at(3, 5, '2026-10-12', 1),
      at(4, 5, TODAY, 0),
    ],
    [
      'two missed days with two freezes',
      at(3, 5, '2026-10-11', 2),
      at(4, 5, TODAY, 0),
    ],
    [
      'two missed days with one freeze: restart, the freeze is kept',
      at(3, 5, '2026-10-11', 1),
      at(1, 5, TODAY, 1),
    ],
    [
      'no missed day: freezes untouched',
      at(3, 5, '2026-10-13', 2),
      at(4, 5, TODAY, 2),
    ],
  ])('%s', (_case, prev, expected) => {
    expect(nextStreak(prev, TODAY)).toEqual(expected);
  });

  it.each([
    ['day 7 earns a freeze', at(6, 6, '2026-10-13', 0), at(7, 7, TODAY, 1)],
    ['day 14 earns another', at(13, 13, '2026-10-13', 1), at(14, 14, TODAY, 2)],
    ['never more than 2', at(20, 20, '2026-10-13', 2), at(21, 21, TODAY, 2)],
    ['day 8 earns nothing', at(7, 7, '2026-10-13', 1), at(8, 8, TODAY, 1)],
    [
      'a freeze used to reach day 7 is replaced',
      at(6, 6, '2026-10-12', 1),
      at(7, 7, TODAY, 1),
    ],
  ])('%s', (_case, prev, expected) => {
    expect(nextStreak(prev, TODAY)).toEqual(expected);
  });

  it('crosses month and year ends', () => {
    expect(nextStreak(at(1, 1, '2026-12-31'), '2027-01-01').current).toBe(2);
    expect(nextStreak(at(1, 1, '2028-02-28'), '2028-02-29').current).toBe(2);
  });
});

describe('visibleStreak', () => {
  it.each([
    ['active today', at(4, 6, TODAY), 4],
    ['active yesterday (still alive)', at(4, 6, '2026-10-13'), 4],
    ['missed a day, no freeze', at(4, 6, '2026-10-12'), 0],
    ['missed a day, a freeze covers it', at(4, 6, '2026-10-12', 1), 4],
    ['missed two days, one freeze', at(4, 6, '2026-10-11', 1), 0],
    ['missed two days, two freezes', at(4, 6, '2026-10-11', 2), 4],
  ])('%s', (_case, state, shown) => {
    expect(visibleStreak(state, TODAY)).toBe(shown);
  });

  it('is 0 with no activity', () => {
    expect(visibleStreak(NO_STREAK, TODAY)).toBe(0);
  });
});

describe('daysBetween', () => {
  it.each([
    ['2026-10-13', '2026-10-14', 1],
    ['2026-10-14', '2026-10-14', 0],
    ['2026-10-31', '2026-11-02', 2],
    ['2026-12-31', '2027-01-01', 1],
    ['2026-10-14', '2026-10-13', -1],
  ])('%s → %s is %i', (from, to, days) => {
    expect(daysBetween(from, to)).toBe(days);
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
