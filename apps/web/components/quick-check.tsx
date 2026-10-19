'use client';

import type { QuickCheck as QuickCheckData } from '@loophole/shared';
import { ArrowRight, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Byte } from '@/components/byte';
import { InlineCode } from '@/components/inline-code';
import { primaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';

// The Learn step's one question (ADR-021). Ungraded and unrecorded: the
// answer is checked here in the browser, and a wrong pick just says try
// again. Passed answers use Blue (done), wrong ones Ink ✕ (DESIGN_SYSTEM §2).
export function QuickCheck({
  check,
  onDone,
}: {
  check: QuickCheckData;
  onDone: () => void;
}) {
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);

  function pick(i: number) {
    if (solved) return;
    if (i === check.answer) setSolved(true);
    else setWrong((w) => new Set(w).add(i));
  }

  const mood = solved ? 'happy' : wrong.size > 0 ? 'oops' : 'thinking';

  return (
    <section className={`${stickerCard} flex flex-col gap-5 p-5 sm:p-6`}>
      <div className="flex items-center gap-3">
        <Byte mood={mood} className="size-14 shrink-0" />
        <div className="flex flex-col items-start gap-1">
          <span className={`${chip} bg-lemon text-ink`}>Quick check</span>
          <h2 className="font-display text-2xl font-extrabold">
            {check.question}
          </h2>
        </div>
      </div>

      {check.code && (
        <pre className="overflow-x-auto rounded-card border-2 border-ink bg-ink px-4 py-3 font-mono text-sm leading-6 text-canvas">
          {check.code.trimEnd()}
        </pre>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
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
                className={`flex w-full items-center gap-3 rounded-card border-2 border-ink px-4 py-3 text-left font-mono text-sm transition-[translate,box-shadow] duration-[50ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  isAnswer
                    ? 'bg-blue-tint'
                    : isWrong
                      ? 'bg-surface text-text-secondary line-through'
                      : 'bg-paper shadow-press active:translate-y-1 active:shadow-none disabled:shadow-none'
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-node border-2 border-ink font-sans text-xs font-bold">
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

      <div aria-live="polite">
        {solved ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-card border-2 border-ink bg-blue-tint px-4 py-3">
              <span className="font-bold">That&apos;s it! </span>
              <InlineCode text={check.explanation} />
            </p>
            <button
              type="button"
              onClick={onDone}
              className={`${primaryButton} self-start`}
            >
              Start the exercise
              <ArrowRight className="size-4" strokeWidth={3} aria-hidden />
            </button>
          </div>
        ) : (
          wrong.size > 0 && (
            <p className="font-bold">
              Not quite. Look at the code again and try another answer.
            </p>
          )
        )}
      </div>
    </section>
  );
}
