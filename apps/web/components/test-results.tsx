import type { SubmissionResult, TestResult } from '@loophole/shared';
import { Check, X } from 'lucide-react';

// What both a lesson submission and a duel submission report.
type Graded = Pick<
  SubmissionResult,
  'testsPassed' | 'totalTests' | 'results' | 'stderr'
>;

// The results panel after Run (FR-07): passed / total, one row per test,
// then the program's error output if there was any. Used by lessons and duels.
export function TestResults({ result }: { result: Graded }) {
  const { testsPassed, totalTests, results, stderr } = result;

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold">
        {testsPassed === totalTests
          ? `All ${totalTests} tests passed`
          : `${testsPassed} of ${totalTests} tests passed`}
      </h2>

      <ul className="flex flex-col gap-2">
        {results.map((r, i) => (
          <TestResultRow key={i} result={r} />
        ))}
      </ul>

      {stderr && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-text-secondary">
            Error output
          </h3>
          <pre className="overflow-x-auto rounded-card bg-surface px-4 py-3 font-mono text-sm leading-6 whitespace-pre-wrap">
            {stderr}
          </pre>
        </div>
      )}
    </section>
  );
}

// TestResultRow from docs/DESIGN_SYSTEM.md §6: ✓ Orange or ✕ Ink. Only
// sample tests have details; hidden tests report pass or fail.
function TestResultRow({ result }: { result: TestResult }) {
  const label = result.kind === 'sample' ? 'Example' : 'Hidden test';
  const showDetails = result.kind === 'sample' && !result.passed;

  return (
    <li className="rounded-card bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        {result.passed ? (
          <span className="flex size-6 items-center justify-center rounded-node bg-orange text-ink">
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </span>
        ) : (
          <span className="flex size-6 items-center justify-center text-ink">
            <X className="size-5" strokeWidth={3} aria-hidden />
          </span>
        )}
        <span className="font-bold">{label}</span>
        <span className="text-sm text-text-secondary">
          {result.passed ? 'passed' : 'failed'}
        </span>
      </div>

      {showDetails && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
          <dt className="text-text-secondary">Input</dt>
          <dd className="whitespace-pre-wrap">
            {result.input.trimEnd() || (
              <span className="text-text-secondary">(no input)</span>
            )}
          </dd>
          <dt className="text-text-secondary">Expected</dt>
          <dd className="whitespace-pre-wrap">{result.expected}</dd>
          <dt className="text-text-secondary">Your output</dt>
          <dd className="whitespace-pre-wrap">
            {result.actual || (
              <span className="text-text-secondary">(nothing printed)</span>
            )}
          </dd>
        </dl>
      )}
    </li>
  );
}
