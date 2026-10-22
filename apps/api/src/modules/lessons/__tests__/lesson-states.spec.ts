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

// ADR-043: a unit's project opens when the lesson before it is done, and
// never holds back the next unit.
describe('lessonStates with projects', () => {
  // Unit 1: a, b, then project p1. Unit 2: c, then project p2.
  const path = ['a', 'b', 'p1', 'c', 'p2'];
  const projects = new Set(['p1', 'p2']);
  const states = (done: string[]) =>
    path.map((id) => lessonStates(path, new Set(done), projects).get(id));

  it('locks a project until its unit is done', () => {
    expect(states(['a'])).toEqual([
      'completed',
      'active',
      'locked',
      'locked',
      'locked',
    ]);
  });

  it('opens the project and the next unit together', () => {
    expect(states(['a', 'b'])).toEqual([
      'completed',
      'completed',
      'active',
      'active',
      'locked',
    ]);
  });

  it('a skipped project stays open while the learner moves on', () => {
    expect(states(['a', 'b', 'c'])).toEqual([
      'completed',
      'completed',
      'active',
      'completed',
      'active',
    ]);
  });

  it('a done project is completed like any lesson', () => {
    expect(states(['a', 'b', 'p1'])).toEqual([
      'completed',
      'completed',
      'completed',
      'active',
      'locked',
    ]);
  });
});
