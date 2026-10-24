'use client';

import type { ExerciseKind, LearnCard } from '@loophole/shared';
import { ArrowLeft } from 'lucide-react';
import { ActionBar } from '@/components/action-bar';
import { ExplainDifferently } from '@/components/explain-differently';
import { GuideSays, type GuideId } from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { LearnExample } from '@/components/learn-example';
import { SpotTheBug } from '@/components/spot-the-bug';
import { primaryButton } from '@/components/ui/buttons';

// The Learn step's teaching cards (ADR-021), one at a time. The course's
// guide says the idea in a speech bubble; the example below it can be
// read, run (or previewed, for web courses) and changed. The lesson owns
// the index so its progress bar can follow along (ADR-029).
export function LearnCards({
  guide,
  lessonId,
  kind,
  language,
  cards,
  index,
  onIndex,
  onDone,
}: {
  guide: GuideId;
  lessonId: string;
  kind: ExerciseKind;
  language: string;
  cards: LearnCard[];
  index: number;
  onIndex: (index: number) => void;
  onDone: () => void;
}) {
  const card = cards[index];
  const last = index === cards.length - 1;
  const next = () => (last ? onDone() : onIndex(index + 1));

  // A spot-the-bug card (ADR-031) brings its own code and bar. key: each
  // card starts fresh.
  if (card.bug && card.code) {
    return (
      <SpotTheBug
        key={index}
        guide={guide}
        card={{ body: card.body, code: card.code, bug: card.bug }}
        onBack={index > 0 ? () => onIndex(index - 1) : undefined}
        nextLabel={last ? 'Quick check' : 'Continue'}
        onNext={next}
      />
    );
  }

  return (
    <section
      className="flex flex-col gap-6"
      aria-roledescription="carousel"
      aria-label={`Card ${index + 1} of ${cards.length}`}
    >
      {/* key: each card starts with its own fresh example. */}
      <div key={index} className="flex flex-col gap-6">
        <GuideSays guide={guide} speak={`${card.title}. ${card.body}`}>
          <h2 className="font-display text-xl font-semibold text-balance sm:text-2xl">
            {card.title}
          </h2>
          <p className="mt-1 text-lg leading-relaxed">
            <InlineCode text={card.body} />
          </p>
        </GuideSays>
        <ExplainDifferently guide={guide} lessonId={lessonId} card={index} />
        {card.code && (
          <LearnExample
            kind={kind}
            language={language}
            lessonId={lessonId}
            code={card.code}
            input={card.input}
            output={card.output}
          />
        )}
      </div>

      <ActionBar>
        {index > 0 ? (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            className="inline-flex items-center gap-1 rounded-badge px-2 py-2 font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
          >
            <ArrowLeft className="size-4" strokeWidth={3} aria-hidden /> Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={next}
          className={`${primaryButton} min-w-40 uppercase sm:min-w-52`}
        >
          {last ? 'Quick check' : 'Continue'}
        </button>
      </ActionBar>
    </section>
  );
}
