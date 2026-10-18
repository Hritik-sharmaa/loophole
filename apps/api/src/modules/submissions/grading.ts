import type { SubmissionStatus, TestCase, TestResult } from '@loophole/shared';
import type { RunResult } from '../../integrations/piston.client.js';

// The submissions.stderr column holds at most 4 KB (docs/DATA_MODEL.md).
export const STDERR_MAX = 4 * 1024;

export const TIMEOUT_MESSAGE =
  'Your program ran for more than 3 seconds and was stopped. Look for a loop that never ends, or an input() waiting for a line that is not there.';

// One test and what the program did with its input.
export type TestRun = {
  kind: 'sample' | 'hidden';
  test: TestCase;
  run: RunResult;
};

export type Grade = {
  status: SubmissionStatus;
  testsPassed: number;
  totalTests: number;
  results: TestResult[];
  stderr: string;
};

// ADR-011: a test passes when trimmed stdout equals trimmed expected output.
// Exact match, so printing extra values fails.
export function outputMatches(stdout: string, expected: string): boolean {
  return stdout.trim() === expected.trim();
}

// Turns raw runs into what the learner sees. The only place that decides
// what a hidden test reveals: whether it passed, nothing else (hard rule 2).
export function grade(runs: readonly TestRun[]): Grade {
  const results: TestResult[] = runs.map(({ kind, test, run }) => {
    const passed =
      !run.timedOut && outputMatches(run.stdout, test.expectedOutput);
    return kind === 'sample'
      ? {
          kind,
          passed,
          input: test.input,
          expected: test.expectedOutput.trim(),
          actual: run.stdout.trim(),
        }
      : { kind, passed };
  });

  const testsPassed = results.filter((r) => r.passed).length;
  const crashed = runs.some((r) => r.run.timedOut || r.run.exitCode !== 0);
  const status: SubmissionStatus =
    testsPassed === runs.length ? 'passed' : crashed ? 'error' : 'failed';

  return {
    status,
    testsPassed,
    totalTests: runs.length,
    results,
    stderr: learnerStderr(runs).slice(0, STDERR_MAX),
  };
}

// stderr comes from sample tests only: a hidden test's traceback can quote
// its input (e.g. "invalid literal for int(): 'abc'"). A time-out says
// nothing about the input, so it is reported for any test.
function learnerStderr(runs: readonly TestRun[]): string {
  const sample = runs.find((r) => r.kind === 'sample' && r.run.stderr.trim());
  if (sample) return sample.run.stderr;
  if (runs.some((r) => r.run.timedOut)) return TIMEOUT_MESSAGE;
  return '';
}
