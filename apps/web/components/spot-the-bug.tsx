'use client';

import type { LearnCard } from '@loophole/shared';
import { ArrowLeft, Bug, Check, X } from 'lucide-react';
import { useState } from 'react';
import { ActionBar } from '@/components/action-bar';
import { GuideSays, type GuideId } from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { primaryButton } from '@/components/ui/buttons';
import { chip } from '@/components/ui/card';

type BugCard = Required<Pick<LearnCard, 'body' | 'code' | 'bug'>>;

// A spot-the-bug card (ADR-031): the learner taps the line they think is
// wrong. Checked here in the browser and never recorded, like the quick
// check. A wrong tap strikes that line; "Show me" gives up and shows it.
// Pink chip: the same skill as a duel (DESIGN_SYSTEM §2).
export function SpotTheBug({
  guide,
  card,
  onBack,
  nextLabel,
  onNext,
}: {
  guide: GuideId;
  card: BugCard;
  onBack?: () => void;
  nextLabel: string;
  // firstTry: found with no wrong taps and without "Show me".
  onNext: (firstTry: boolean) => void;
}) {
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [found, setFound] = useState(false);
  const [shown, setShown] = useState(false);
  const lines = card.code.trimEnd().split('\n');
  const answered = found || shown;

  function pick(line: number) {
    if (answered) return;
    if (line === card.bug.line) setFound(true);
    else setWrong((w) => new Set(w).add(line));
  }

  const mood = found ? 'happy' : wrong.size > 0 ? 'oops' : 'thinking';

  return (
    <section className="flex flex-col gap-6">
      <GuideSays guide={guide} mood={mood} speak={card.body}>
        <span className={`${chip} bg-pink text-ink`}>
          <Bug className="size-3.5" strokeWidth={3} aria-hidden /> Spot the bug
        </span>
        <p className="mt-2 font-display text-xl font-extrabold text-balance sm:text-2xl">
          <InlineCode text={card.body} />
        </p>
      </GuideSays>

      <ol
        aria-label="The code, one line per button"
        className="overflow-x-auto rounded-card border-2 border-ink bg-ink py-2 font-mono text-sm leading-6"
      >
        {lines.map((text, i) => {
          const n = i + 1;
          const isBug = answered && n === card.bug.line;
          const isWrong = wrong.has(n);
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => pick(n)}
                disabled={answered || isWrong}
                aria-label={`Line ${n}${isBug ? ', the bug' : isWrong ? ', not the bug' : ''}`}
                className={`flex w-full min-w-max items-center gap-3 px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange ${
                  isBug
                    ? 'bg-blue-tint text-ink'
                    : isWrong
                      ? 'text-text-tertiary line-through'
                      : 'text-canvas enabled:hover:bg-screen'
                }`}
              >
                <span
                  aria-hidden
                  className={`w-5 shrink-0 text-right ${isBug ? 'text-ink' : 'text-text-tertiary'}`}
                >
                  {n}
                </span>
                <span className="flex-1 whitespace-pre">{text || ' '}</span>
                {isBug && (
                  <Bug
                    className="size-4 shrink-0"
                    strokeWidth={3}
                    aria-hidden
                  />
                )}
                {isWrong && (
                  <X className="size-4 shrink-0" strokeWidth={3} aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <ActionBar
        tone={found ? 'right' : answered || wrong.size > 0 ? 'wrong' : 'plain'}
      >
        <div aria-live="polite" className="min-w-0 flex-1 basis-60">
          {answered ? (
            <p>
              <span className="flex items-center gap-1 font-display text-lg font-extrabold">
                {found ? (
                  <>
                    <Check className="size-5 text-blue" strokeWidth={3.5} />
                    You found it!
                  </>
                ) : (
                  `The bug is on line ${card.bug.line}.`
                )}
              </span>
              <InlineCode text={card.bug.fix} />
            </p>
          ) : wrong.size > 0 ? (
            <p className="flex flex-wrap items-center gap-x-3 font-bold">
              Not that one. Look again.
              <button
                type="button"
                onClick={() => setShown(true)}
                className="rounded-badge text-text-secondary underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Show me
              </button>
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-x-4 font-bold text-text-secondary">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1 rounded-badge hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <ArrowLeft className="size-4" strokeWidth={3} aria-hidden />{' '}
                  Back
                </button>
              )}
              Tap the line with the bug.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onNext(found && wrong.size === 0)}
          disabled={!answered}
          className={`${primaryButton} min-w-40 uppercase sm:min-w-52`}
        >
          {nextLabel}
        </button>
      </ActionBar>
    </section>
  );
}
