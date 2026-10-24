import { HttpException, HttpStatus } from '@nestjs/common';
import type { TestCase } from '@loophole/shared';
import type {
  PistonClient,
  RunResult,
} from '../../integrations/piston.client.js';
import { withProgramHelpers } from '../../common/program-helpers.js';
import type { TestRun } from './grading.js';

// Users with a program in Piston right now. In memory like the Piston
// queue itself (ADR-018): one API instance.
const running = new Set<string>();

// Runs `job` unless this user already has one running, across lessons,
// runs, duels, bot duels and the bug of the day: 429 RATE_LIMITED then.
// Without it, one user firing requests in parallel could fill the shared
// Piston queue for everyone.
export async function oneRunAtATime<T>(
  userId: string,
  job: () => Promise<T>,
): Promise<T> {
  if (running.has(userId)) {
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Your last run is still going. Wait for it to finish.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  running.add(userId);
  try {
    return await job();
  } finally {
    running.delete(userId);
  }
}

// Stands in for a test that was not run; grade() counts it as failed.
const SKIPPED: RunResult = {
  stdout: '',
  stderr: '',
  exitCode: null,
  timedOut: false,
};

// Runs `code` against every sample test, then every hidden test, for
// lessons and duels alike. One test at a time (PistonClient queues runs
// anyway, ADR-018). After a time-out the rest are skipped: a program that
// hangs would otherwise hold the shared Piston queue for 3 s per test.
// One grading per user at a time (oneRunAtATime).
export function runTests(
  piston: PistonClient,
  userId: string,
  language: string,
  code: string,
  sampleTests: readonly TestCase[],
  hiddenTests: readonly TestCase[],
): Promise<TestRun[]> {
  const tests = [
    ...sampleTests.map((test) => ({ kind: 'sample' as const, test })),
    ...hiddenTests.map((test) => ({ kind: 'hidden' as const, test })),
  ];
  const program = withProgramHelpers(language, code);
  return oneRunAtATime(userId, async () => {
    const runs: TestRun[] = [];
    for (const t of tests) {
      const timedOutBefore = runs.some((r) => r.run.timedOut);
      const run = timedOutBefore
        ? SKIPPED
        : await piston.run(language, program, t.test.input);
      runs.push({ ...t, run });
    }
    return runs;
  });
}
