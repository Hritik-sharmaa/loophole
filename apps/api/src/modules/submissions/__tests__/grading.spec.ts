import type { RunResult } from '../../../integrations/piston.client.js';
import {
  STDERR_MAX,
  TIMEOUT_MESSAGE,
  grade,
  outputMatches,
  type TestRun,
} from '../grading.js';

const ok = (stdout: string): RunResult => ({
  stdout,
  stderr: '',
  exitCode: 0,
  timedOut: false,
});
const crash = (stderr: string): RunResult => ({
  stdout: '',
  stderr,
  exitCode: 1,
  timedOut: false,
});
const timeout: RunResult = {
  stdout: '',
  stderr: '',
  exitCode: null,
  timedOut: true,
};

const sample = (expectedOutput: string, run: RunResult): TestRun => ({
  kind: 'sample',
  test: { input: '2\n3\n', expectedOutput },
  run,
});
const hidden = (expectedOutput: string, run: RunResult): TestRun => ({
  kind: 'hidden',
  test: { input: 'secret-input\n', expectedOutput },
  run,
});

describe('outputMatches (ADR-011)', () => {
  it.each([
    ['exact', '5', '5', true],
    ['trailing newline', '5\n', '5', true],
    ['surrounding spaces', '  5  \n', '5', true],
    ['expected has a newline', '5', '5\n', true],
    ['multi-line output', 'a\nb\n', 'a\nb', true],
    ['wrong value', '6', '5', false],
    ['extra value printed', '5\n6', '5', false],
    ['contains is not enough', 'Answer: 5', '5', false],
    ['case matters', 'hello', 'Hello', false],
    ['inner spacing matters', 'a  b', 'a b', false],
    ['nothing printed', '', '5', false],
  ])('%s', (_case, stdout, expected, matches) => {
    expect(outputMatches(stdout, expected)).toBe(matches);
  });
});

describe('grade', () => {
  it('passes when every test matches', () => {
    const g = grade([sample('5', ok('5\n')), hidden('0', ok('0\n'))]);
    expect(g).toMatchObject({
      status: 'passed',
      testsPassed: 2,
      totalTests: 2,
      stderr: '',
    });
  });

  it('fails (not error) when the program runs but prints the wrong thing', () => {
    const g = grade([sample('5', ok('5')), hidden('0', ok('1'))]);
    expect(g).toMatchObject({ status: 'failed', testsPassed: 1 });
  });

  it('is an error when any run crashed', () => {
    const g = grade([sample('5', ok('5')), hidden('0', crash('Traceback'))]);
    expect(g).toMatchObject({ status: 'error', testsPassed: 1 });
  });

  it('a timed-out run never passes, even if its output matched so far', () => {
    const g = grade([sample('', { ...timeout, stdout: '' })]);
    expect(g).toMatchObject({ status: 'error', testsPassed: 0 });
    expect(g.stderr).toBe(TIMEOUT_MESSAGE);
  });

  it('shows input, expected and actual for sample tests', () => {
    const { results } = grade([sample('5', ok('6\n'))]);
    expect(results).toEqual([
      {
        kind: 'sample',
        passed: false,
        input: '2\n3\n',
        expected: '5',
        actual: '6',
      },
    ]);
  });

  // AGENTS.md hard rule 2.
  it('hidden results carry only kind and passed', () => {
    const { results } = grade([
      hidden('A', ok('A')),
      hidden('B', crash('ValueError: secret-input')),
    ]);
    expect(results).toEqual([
      { kind: 'hidden', passed: true },
      { kind: 'hidden', passed: false },
    ]);
  });

  it('never returns stderr from a hidden test', () => {
    const g = grade([
      sample('5', ok('5')),
      hidden('0', crash("ValueError: invalid literal: 'secret-input'")),
    ]);
    expect(g.stderr).toBe('');
    expect(JSON.stringify(g)).not.toContain('secret-input');
  });

  it('returns the first sample stderr', () => {
    const g = grade([
      sample('5', ok('5')),
      sample('5', crash('NameError: x')),
      sample('5', crash('second error')),
    ]);
    expect(g.stderr).toBe('NameError: x');
  });

  it('reports a hidden time-out with the generic message', () => {
    const g = grade([sample('5', ok('5')), hidden('0', timeout)]);
    expect(g.stderr).toBe(TIMEOUT_MESSAGE);
  });

  it('truncates stderr to 4 KB', () => {
    const g = grade([sample('5', crash('x'.repeat(STDERR_MAX + 100)))]);
    expect(g.stderr).toHaveLength(STDERR_MAX);
  });
});
