'use client';

import { ArrowRight, Bug, Check } from 'lucide-react';
import Link from 'next/link';
import { secondaryButton } from '@/components/ui/buttons';
import { chip, stickerOutline } from '@/components/ui/card';
import { formatDuration } from '@/lib/format-time';
import { useDailyBugBoard } from '@/lib/queries/use-daily-bug';

// The way into the bug of the day (ADR-035), on the signed-in home. Pink
// like a duel: the same skill. It reads only the board, so seeing the card
// never starts the learner's clock.
export function DailyBugCard({ enabled }: { enabled: boolean }) {
  const board = useDailyBugBoard(enabled);
  if (!board.data) return null;
  const { title, solvers, me } = board.data;

  return (
    <section
      aria-label="Bug of the day"
      className={`${stickerOutline} flex flex-col gap-4 bg-pink p-5 sm:flex-row sm:items-center`}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-node border-2 border-ink bg-paper">
        <Bug className="size-7" strokeWidth={2.5} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`${chip} self-start bg-paper text-ink`}>
          Bug of the day
        </span>
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        <p className="text-sm font-bold">
          {me ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-4" strokeWidth={3} aria-hidden /> You fixed
              it in {formatDuration(me.timeMs)}: #{me.rank} today
            </span>
          ) : solvers === 0 ? (
            'Nobody has fixed it yet. Be the first!'
          ) : (
            `${solvers} ${solvers === 1 ? 'learner has' : 'learners have'} fixed it. How fast are you?`
          )}
        </p>
      </div>
      <Link
        href="/bug-of-the-day"
        className={`${secondaryButton} self-start sm:self-center`}
      >
        {me ? 'See the board' : 'Squash it'}{' '}
        <ArrowRight className="size-4" strokeWidth={3} aria-hidden />
      </Link>
    </section>
  );
}
