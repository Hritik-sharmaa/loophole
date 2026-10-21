'use client';

import { MessageCircleQuestion, RotateCcw } from 'lucide-react';
import { GuideSays, type GuideId } from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { useExplainCard } from '@/lib/queries/use-ai';

// "Didn't get it?" under a Learn card (ADR-036): the guide explains the
// same idea again in other words, through the AI tutor and its daily cap.
// The server reads the card itself; only its index is sent.
export function ExplainDifferently({
  guide,
  lessonId,
  card,
}: {
  guide: GuideId;
  lessonId: string;
  card: number;
}) {
  const explain = useExplainCard();
  const ask = () => explain.mutate({ lessonId, card });

  if (explain.isPending) {
    return (
      <GuideSays guide={guide} mood="thinking">
        <p aria-live="polite" className="text-lg font-bold">
          Let me think of another way to say it…
        </p>
      </GuideSays>
    );
  }

  if (explain.data) {
    return (
      <GuideSays guide={guide} mood="happy" speak={explain.data.explanation}>
        <p className="text-xs font-bold tracking-wide text-text-secondary uppercase">
          In other words
        </p>
        <p
          aria-live="polite"
          className="mt-1 text-lg leading-relaxed whitespace-pre-line"
        >
          <InlineCode text={explain.data.explanation} />
        </p>
        <p className="mt-2 text-xs font-semibold text-text-secondary">
          {explain.data.remainingToday} tutor{' '}
          {explain.data.remainingToday === 1 ? 'request' : 'requests'} left
          today
        </p>
      </GuideSays>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:pl-[111px]">
      <button
        type="button"
        onClick={ask}
        className="inline-flex items-center gap-1.5 rounded-badge text-sm font-bold text-text-secondary underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {explain.isError ? (
          <RotateCcw className="size-4" strokeWidth={3} aria-hidden />
        ) : (
          <MessageCircleQuestion
            className="size-4"
            strokeWidth={2.5}
            aria-hidden
          />
        )}
        {explain.isError
          ? 'Try again'
          : 'Didn’t get it? Explain it differently'}
      </button>
      {explain.isError && (
        <p role="alert" className="text-sm font-semibold">
          ✕ {explain.error.message}
        </p>
      )}
    </div>
  );
}
