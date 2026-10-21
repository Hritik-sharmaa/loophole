import type { BotOpponent } from '@loophole/shared';

export const BOT_OPPONENTS: readonly BotOpponent[] = [
  'meera',
  'arjun',
  'harpreet',
];

// How long each bot usually takes to fix a duel problem (ADR-039): Meera
// is the gentle one, Harpreet the quick one. All finish well inside the
// five-minute duel.
export const BOT_PACE_MS: Record<BotOpponent, number> = {
  meera: 240_000,
  arjun: 165_000,
  harpreet: 105_000,
};

// Each race moves the finish up to this much either way.
export const PACE_JITTER_MS = 15_000;

// The bot reads the code for this share of its time before a test passes.
const READING_SHARE = 0.3;

// When the bot passes each of `totalTests` tests, in ms after the start:
// after reading, the time left is cut into one slot per test and each
// test passes somewhere in its slot, the last one exactly at the finish.
// Never decreasing. `rand` is injectable for tests.
export function botSchedule(
  opponent: BotOpponent,
  totalTests: number,
  rand: () => number = Math.random,
): number[] {
  const finish = BOT_PACE_MS[opponent] + (rand() * 2 - 1) * PACE_JITTER_MS;
  const reading = finish * READING_SHARE;
  const slot = (finish - reading) / totalTests;
  const times: number[] = [];
  for (let i = 0; i < totalTests - 1; i++) {
    times.push(Math.round(reading + slot * (i + rand())));
  }
  times.push(Math.round(finish));
  return times;
}

// The instant the bot finishes: its last scheduled test.
export function botFinishAt(startedAt: Date, schedule: number[]): Date {
  return new Date(startedAt.getTime() + (schedule.at(-1) ?? 0));
}
