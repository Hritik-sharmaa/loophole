'use client';

import type { DuelHistoryEntry, MyDuelOutcome } from '@loophole/shared';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { LanguageLogo } from '@/components/language-logo';
import { chip } from '@/components/ui/card';
import { useDuelHistory } from '@/lib/queries/use-duel-history';

// How many finished duels the lobby lists.
const SHOWN = 5;

export const OUTCOME: Record<MyDuelOutcome, { label: string; tone: string }> = {
  won: { label: 'Won', tone: 'bg-lemon' },
  lost: { label: 'Lost', tone: 'bg-surface' },
  draw: { label: 'Draw', tone: 'bg-violet-tint' },
};

// "Your recent duels" on the duels page (ADR-041): each finished duel with
// a link to its replay. Hidden until the learner has finished one.
export function DuelHistory({ enabled }: { enabled: boolean }) {
  const history = useDuelHistory(enabled);
  const duels = history.data?.slice(0, SHOWN) ?? [];
  if (duels.length === 0) return null;

  return (
    <section
      aria-labelledby="history-heading"
      className="mt-8 flex flex-col gap-4"
    >
      <h2 id="history-heading" className="font-display text-2xl font-semibold">
        Your recent duels
      </h2>
      <ul className="flex flex-col gap-2">
        {duels.map((d) => (
          <HistoryRow key={d.id} duel={d} />
        ))}
      </ul>
    </section>
  );
}

function HistoryRow({ duel }: { duel: DuelHistoryEntry }) {
  const { label, tone } = OUTCOME[duel.outcome];
  const day = new Date(duel.endedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border-muted bg-paper px-4 py-3">
      <span className={`${chip} ${tone} w-14 justify-center text-ink`}>
        {label}
      </span>
      <LanguageLogo language={duel.language} className="size-6 shrink-0" />
      <div className="min-w-40 flex-1">
        <p className="font-bold">{duel.title}</p>
        <p className="text-sm text-text-secondary">
          vs {duel.opponent} · {duel.myBest} / {duel.totalTests} vs{' '}
          {duel.opponentBest} / {duel.totalTests} · {day}
        </p>
      </div>
      <Link
        href={`/duels/replay/${duel.id}`}
        aria-label={`Watch the replay of ${duel.title} against ${duel.opponent}`}
        className="flex items-center gap-1 rounded-badge text-sm font-bold underline hover:text-sun-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
      >
        <Play className="size-4" strokeWidth={3} aria-hidden /> Watch
      </Link>
    </li>
  );
}
