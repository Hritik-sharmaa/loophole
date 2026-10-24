import type { SubmissionResult } from '@loophole/shared';
import { Check, X } from 'lucide-react';
import { InlineCode } from '@/components/inline-code';

// A web exercise's checks (ADR-024), all visible from the start: a to-do
// list before the first submission, then ✓ Blue / ✕ Ink per check
// (DESIGN_SYSTEM §6, TestResultRow). Broken CSS is shown underneath, since
// it is usually why a style check failed.
export function Checklist({
  checks,
  result,
}: {
  checks: string[];
  result: SubmissionResult | undefined;
}) {
  const passed = new Map(
    result?.results.flatMap((r) =>
      r.kind === 'check' ? [[r.label, r.passed] as const] : [],
    ),
  );

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold">
        {result
          ? result.testsPassed === result.totalTests
            ? `All ${result.totalTests} checks pass`
            : `${result.testsPassed} of ${result.totalTests} checks pass`
          : 'Your page must'}
      </h2>
      <ul className="flex flex-col gap-2">
        {checks.map((label) => {
          const state = passed.get(label);
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-card border border-border-muted px-4 py-2.5 ${state ? 'bg-violet-tint' : 'bg-paper'}`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-node border-2 ${state === undefined ? 'border-dashed border-border-muted' : state ? 'border-violet bg-violet text-paper' : 'border-violet text-ink'}`}
              >
                {state === true && (
                  <Check className="size-3.5" strokeWidth={3.5} aria-hidden />
                )}
                {state === false && (
                  <X className="size-3.5" strokeWidth={3.5} aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <InlineCode text={label} />
                {state !== undefined && (
                  <span className="sr-only">
                    {state ? ' (passed)' : ' (failed)'}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {result?.stderr && (
        <pre className="overflow-x-auto rounded-card border border-ink bg-ink px-4 py-3 font-mono text-sm leading-6 whitespace-pre-wrap text-canvas">
          {result.stderr}
        </pre>
      )}
    </section>
  );
}
