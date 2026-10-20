'use client';

import type { ExerciseKind, LearnCard } from '@loophole/shared';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { InlineCode } from '@/components/inline-code';
import { LearnExample } from '@/components/learn-example';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';

// The Learn step's teaching cards (ADR-021), one at a time: an idea, then
// an example to read, run (or preview, for web courses) and change. The
// last card leads to the check.
export function LearnCards({
  lessonId,
  kind,
  language,
  cards,
  onDone,
}: {
  lessonId: string;
  kind: ExerciseKind;
  language: string;
  cards: LearnCard[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const last = index === cards.length - 1;

  return (
    <section
      className={`${stickerCard} flex flex-col gap-5 p-5 sm:p-6`}
      aria-roledescription="carousel"
      aria-label="Lesson cards"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`${chip} bg-lemon text-ink`}>
          Card {index + 1} of {cards.length}
        </span>
        {/* Progress dots: walked cards Blue, the current one Orange. */}
        <span aria-hidden className="flex gap-1.5">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full border-2 border-ink transition-[width] duration-300 ${i === index ? 'w-6 bg-orange' : i < index ? 'w-2.5 bg-blue' : 'w-2.5 bg-paper'}`}
            />
          ))}
        </span>
      </div>

      {/* key: each card starts with its own fresh example. */}
      <div key={index} className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-extrabold text-balance sm:text-3xl">
          {card.title}
        </h2>
        <p className="text-lg leading-relaxed">
          <InlineCode text={card.body} />
        </p>
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-border-muted pt-4">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className={secondaryButton}
          >
            <ArrowLeft className="size-4" strokeWidth={3} aria-hidden /> Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => (last ? onDone() : setIndex(index + 1))}
          className={primaryButton}
        >
          {last ? 'Quick check' : 'Next'}
          <ArrowRight className="size-4" strokeWidth={3} aria-hidden />
        </button>
      </div>
    </section>
  );
}
