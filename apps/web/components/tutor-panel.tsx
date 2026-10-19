'use client';

import type { SubmissionResult } from '@loophole/shared';
import { Lightbulb, MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';
import { Byte } from '@/components/byte';
import { InlineCode } from '@/components/inline-code';
import { secondaryButton } from '@/components/ui/buttons';
import { useExplain, useHint } from '@/lib/queries/use-ai';

type Answer = {
  kind: 'hint' | 'explain';
  text: string;
  line: number | null;
  remainingToday: number;
};

// The AI tutor (J-2), voiced by Byte: "Hint" for the code in the editor,
// and "Explain my error" once a run has failed. Secondary buttons: Run
// keeps the orange.
export function TutorPanel({
  exerciseId,
  code,
  submission,
}: {
  exerciseId: string;
  code: string;
  submission: SubmissionResult | undefined;
}) {
  const explain = useExplain();
  const hint = useHint();
  const [answer, setAnswer] = useState<Answer | null>(null);

  const failed = submission && submission.status !== 'passed';
  const pending = explain.isPending || hint.isPending;
  // Only the error from the most recent click is shown.
  const error = [explain, hint].find((m) => m.isError)?.error;

  function askHint() {
    explain.reset();
    hint.mutate(
      { exerciseId, code },
      {
        onSuccess: (r) =>
          setAnswer({ kind: 'hint', text: r.hint, line: null, ...r }),
      },
    );
  }

  function askExplain() {
    if (!submission) return;
    hint.reset();
    explain.mutate(
      { submissionId: submission.id },
      {
        onSuccess: (r) =>
          setAnswer({ kind: 'explain', text: r.explanation, ...r }),
      },
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-card border-2 border-ink bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Byte mood={pending ? 'thinking' : 'idle'} className="size-12" />
        <h2 className="mr-auto font-display text-xl font-bold">
          Stuck? Ask Byte
        </h2>
        <button
          type="button"
          onClick={askHint}
          disabled={pending}
          className={secondaryButton}
        >
          <Lightbulb className="size-4" strokeWidth={3} />
          {hint.isPending ? 'Thinking…' : 'Hint'}
        </button>
        {failed && (
          <button
            type="button"
            onClick={askExplain}
            disabled={pending}
            className={secondaryButton}
          >
            <MessageCircleQuestion className="size-4" strokeWidth={3} />
            {explain.isPending ? 'Thinking…' : 'Explain my error'}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="font-bold">
          {error.message}
        </p>
      )}

      {answer && !error && (
        <div
          aria-live="polite"
          className="flex flex-col gap-2 rounded-card border-2 border-ink bg-paper px-4 py-3 shadow-sticker-sm"
        >
          <p className="text-xs font-bold tracking-wide text-text-secondary uppercase">
            {answer.kind === 'hint' ? 'Hint' : 'What went wrong'}
            {answer.line !== null && ` · line ${answer.line}`}
          </p>
          <p className="whitespace-pre-line">
            <InlineCode text={answer.text} />
          </p>
          <p className="text-xs font-semibold text-text-secondary">
            {answer.remainingToday} tutor{' '}
            {answer.remainingToday === 1 ? 'request' : 'requests'} left today
          </p>
        </div>
      )}
    </section>
  );
}
