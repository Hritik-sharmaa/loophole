import { outcomeFor, replayEvents } from '../duel-replay.js';

const ME = 'me-id';
const THEM = 'them-id';
const START = new Date('2026-10-21T10:00:00Z');
const at = (s: number) => new Date(START.getTime() + s * 1000);

describe('outcomeFor', () => {
  it('a win for the winner is a loss for the other', () => {
    expect(outcomeFor({ result: 'win', winnerId: ME }, ME)).toBe('won');
    expect(outcomeFor({ result: 'win', winnerId: ME }, THEM)).toBe('lost');
  });

  it('a forfeit counts like a win for the one who stayed', () => {
    expect(outcomeFor({ result: 'forfeit', winnerId: THEM }, ME)).toBe('lost');
  });

  it('a draw has no winner', () => {
    expect(outcomeFor({ result: 'draw', winnerId: null }, ME)).toBe('draw');
  });
});

describe('replayEvents', () => {
  const attempts = [
    {
      userId: THEM,
      code: 'their fix',
      testsPassed: 5,
      totalTests: 5,
      submittedAt: at(70),
    },
    {
      userId: ME,
      code: 'my try',
      testsPassed: 2,
      totalTests: 5,
      submittedAt: at(42),
    },
    {
      userId: ME,
      code: 'late',
      testsPassed: 3,
      totalTests: 5,
      submittedAt: at(75),
    },
  ];

  it('orders attempts by time, measured from the start', () => {
    const events = replayEvents(attempts, ME, START, 72_000);
    expect(events.map((e) => [e.who, e.atMs, e.testsPassed])).toEqual([
      ['me', 42_000, 2],
      ['opponent', 70_000, 5],
      // Saved after the end: placed at the end.
      ['me', 72_000, 3],
    ]);
  });

  it('never includes the opponent’s code, always the caller’s', () => {
    const events = replayEvents(attempts, ME, START, 72_000);
    expect(
      events.filter((e) => e.who === 'opponent').map((e) => e.code),
    ).toEqual([null]);
    expect(events.filter((e) => e.who === 'me').map((e) => e.code)).toEqual([
      'my try',
      'late',
    ]);
    expect(JSON.stringify(events)).not.toContain('their fix');
  });

  it('seen from the other side, the code flips', () => {
    const events = replayEvents(attempts, THEM, START, 72_000);
    expect(events.map((e) => e.code)).toEqual([null, 'their fix', null]);
  });
});
