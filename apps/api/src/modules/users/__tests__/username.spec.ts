import {
  toUsernameBase,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
  withRandomSuffix,
} from '../username.js';

describe('toUsernameBase', () => {
  it.each([
    ['an email', 'Hritik.S@gmail.com', 'hritik_s'],
    [
      'a Google name with spaces and capitals',
      'Hritik Sharma',
      'hritik_sharma',
    ],
    ['accents and apostrophes', "José O'Neil!", 'jos_oneil'],
    ['emoji and symbols only', '🔥🔥 !!', 'user'],
    ['a very long name', 'Abcdefghij Klmnopqrst Uvwxyz', 'abcdefghij_klmno'],
    ['a 1-char name', 'A', 'a_user'],
    ['an empty string', '', 'user'],
    ['dashes and repeated separators', '--jo__ann--', 'jo_ann'],
  ])('handles %s', (_case, source, expected) => {
    expect(toUsernameBase(source)).toBe(expected);
  });

  it('always returns a valid username', () => {
    for (const source of ['x', 'Ünïcødé Ñame', 'a'.repeat(100), '___']) {
      const base = toUsernameBase(source);
      expect(base).toMatch(USERNAME_PATTERN);
      expect(base.length).toBeGreaterThanOrEqual(USERNAME_MIN);
      expect(base.length).toBeLessThanOrEqual(USERNAME_MAX);
    }
  });
});

describe('withRandomSuffix', () => {
  it('adds 4 digits and stays within the max length', () => {
    const name = withRandomSuffix(toUsernameBase('a'.repeat(100)));
    expect(name).toMatch(/^a{16}\d{4}$/);
    expect(name.length).toBeLessThanOrEqual(USERNAME_MAX);
  });
});
