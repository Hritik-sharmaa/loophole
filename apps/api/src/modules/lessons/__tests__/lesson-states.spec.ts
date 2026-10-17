import { lessonStates } from '../lesson-states.js';

describe('lessonStates', () => {
  const path = ['l1', 'l2', 'l3', 'l4'];

  it.each([
    ['a new user', [], ['active', 'locked', 'locked', 'locked']],
    [
      'a user part-way through',
      ['l1', 'l2'],
      ['completed', 'completed', 'active', 'locked'],
    ],
    [
      'every lesson completed',
      path,
      ['completed', 'completed', 'completed', 'completed'],
    ],
    // Not reachable through the app, but the rule stays simple: the first
    // unfinished lesson is the active one.
    [
      'a gap in completions',
      ['l1', 'l3'],
      ['completed', 'active', 'completed', 'locked'],
    ],
    [
      'completions from another course',
      ['other'],
      ['active', 'locked', 'locked', 'locked'],
    ],
  ])('handles %s', (_case, completed, expected) => {
    const states = lessonStates(path, new Set(completed));
    expect(path.map((id) => states.get(id))).toEqual(expected);
  });

  it('returns nothing for an empty course', () => {
    expect(lessonStates([], new Set(['l1'])).size).toBe(0);
  });
});
