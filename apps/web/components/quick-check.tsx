'use client';

import type { QuickCheck as QuickCheckData } from '@loophole/shared';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { ActionBar } from '@/components/action-bar';
import { GuideSays, type GuideId } from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { primaryButton } from '@/components/ui/buttons';
import { chip } from '@/components/ui/card';
import { useLessonWords } from '@/lib/lesson-words';

// The Learn step's one question (ADR-021). Ungraded and unrecorded: the
// answer is checked here in the browser, and a wrong pick just says try
// again. The verdict shows in the bottom bar (ADR-029): Blue-tint when
// right, Surface when wrong (DESIGN_SYSTEM §2: no red).
export function QuickCheck({
  guide,
  check,
  nextLabel = 'Start the exercise',
  onDone,
}: {
  guide: GuideId;
  check: QuickCheckData;
  nextLabel?: string;
  // firstTry: solved with no wrong pick (the practice stop counts these).
  onDone: (firstTry: boolean) => void;
}) {
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);
  // The most recent pick: the bar answers that one.
  const [lastWrong, setLastWrong] = useState(false);

  function pick(i: number) {
    if (solved) return;
    if (i === check.answer) {
      setSolved(true);
      setLastWrong(false);
    } else {
      setWrong((w) => new Set(w).add(i));
      setLastWrong(true);
    }
  }

  const mood = solved ? 'happy' : lastWrong ? 'oops' : 'thinking';
  const words = useLessonWords();

  return (
    <section className="flex flex-col gap-6">
      <GuideSays guide={guide} mood={mood} speak={check.question}>
        <span className={`${chip} bg-lemon text-ink`}>Quick check</span>
        <h2 className="mt-2 font-display text-xl font-semibold sm:text-2xl">
          {check.question}
        </h2>
      </GuideSays>

      {check.code && (
        <pre className="overflow-x-auto rounded-card border border-ink bg-ink px-4 py-3 font-mono text-sm leading-6 text-canvas">
          {check.code.trimEnd()}
        </pre>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {check.options.map((option, i) => {
          const isAnswer = solved && i === check.answer;
          const isWrong = wrong.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(i)}
                disabled={solved || isWrong}
                aria-pressed={isAnswer || isWrong}
                className={`flex w-full items-center gap-3 rounded-card border border-border-muted px-4 py-3 text-left font-mono text-sm transition-[translate,box-shadow] duration-[50ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet ${
                  isAnswer
                    ? 'bg-violet-tint'
                    : isWrong
                      ? 'bg-surface text-text-secondary line-through'
                      : 'bg-paper shadow-press active:translate-y-1 active:shadow-none disabled:shadow-none'
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-node border border-border-muted font-sans text-xs font-bold">
                  {isAnswer ? (
                    <Check className="size-3.5" strokeWidth={3.5} />
                  ) : isWrong ? (
                    <X className="size-3.5" strokeWidth={3.5} />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="min-w-0 whitespace-pre-wrap">{option}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <ActionBar tone={solved ? 'right' : lastWrong ? 'wrong' : 'plain'}>
        <div aria-live="polite" className="min-w-0 flex-1 basis-60">
          {solved ? (
            <p>
              <span className="flex items-center gap-1 font-display text-lg font-semibold">
                <Check className="size-5 text-violet" strokeWidth={3.5} />
                {words.right}
              </span>
              <InlineCode text={check.explanation} />
            </p>
          ) : lastWrong ? (
            <p className="font-bold">{words.wrong}</p>
          ) : (
            <p className="font-bold text-text-secondary">{words.pick}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDone(wrong.size === 0)}
          disabled={!solved}
          className={`${primaryButton} min-w-40 uppercase sm:min-w-52`}
        >
          {nextLabel}
        </button>
      </ActionBar>
    </section>
  );
}
