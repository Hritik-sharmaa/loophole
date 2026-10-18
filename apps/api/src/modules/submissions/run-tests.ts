import type { TestCase } from '@loophole/shared';
import type {
  PistonClient,
  RunResult,
} from '../../integrations/piston.client.js';
import type { TestRun } from './grading.js';

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
export async function runTests(
  piston: PistonClient,
  language: string,
  code: string,
  sampleTests: readonly TestCase[],
  hiddenTests: readonly TestCase[],
): Promise<TestRun[]> {
  const tests = [
    ...sampleTests.map((test) => ({ kind: 'sample' as const, test })),
    ...hiddenTests.map((test) => ({ kind: 'hidden' as const, test })),
  ];
  const runs: TestRun[] = [];
  for (const t of tests) {
    const timedOutBefore = runs.some((r) => r.run.timedOut);
    const run = timedOutBefore
      ? SKIPPED
      : await piston.run(language, code, t.test.input);
    runs.push({ ...t, run });
  }
  return runs;
}
