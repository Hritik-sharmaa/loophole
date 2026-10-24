import type { DailyBugBoard as Board } from '@loophole/shared';
import { Timer } from 'lucide-react';
import { Guide } from '@/components/guide';
import { stickerCard } from '@/components/ui/card';
import { formatDuration } from '@/lib/format-time';

type Entry = Board['entries'][number];

// Today's fastest solves of the bug of the day (ADR-035). Rows like the
// weekly leaderboard: the top three on Lemon, your row on Orange-tint.
// When you solved it but are not in the top 10, your row follows.
export function DailyBugBoard({
  board,
  myId,
}: {
  board: Board;
  myId: string | undefined;
}) {
  const inTop = board.entries.some((e) => e.userId === myId);
  return (
    <section
      aria-labelledby="daily-board"
      className={`${stickerCard} flex flex-col gap-4 p-5`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="daily-board" className="font-display text-2xl font-semibold">
          Today&apos;s fastest
        </h2>
        <p className="text-sm font-bold text-text-secondary">
          {board.solvers === 1
            ? '1 learner solved it'
            : `${board.solvers} learners solved it`}
        </p>
      </div>

      {board.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center font-bold">
          <Guide guide="priya" mood="thinking" className="h-24 w-[68px]" />
          <p>Nobody has squashed it yet. Be the first!</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {board.entries.map((e) => (
            <Row key={e.userId} entry={e} mine={e.userId === myId} />
          ))}
          {board.me && !inTop && myId && (
            <>
              <li aria-hidden className="text-center font-bold">
                ⋯
              </li>
              <Row
                entry={{
                  rank: board.me.rank,
                  userId: myId,
                  username: 'You',
                  timeMs: board.me.timeMs,
                  attempts: 0,
                }}
                mine
              />
            </>
          )}
        </ol>
      )}
    </section>
  );
}

function Row({ entry, mine }: { entry: Entry; mine: boolean }) {
  return (
    <li
      aria-current={mine ? 'true' : undefined}
      className={`flex items-center gap-4 rounded-card border border-border-muted px-4 py-2.5 ${mine ? 'bg-sun-tint shadow-sticker-sm' : 'bg-paper'}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-node border border-border-muted font-display text-lg font-semibold ${entry.rank <= 3 ? 'bg-lemon' : 'bg-surface'}`}
      >
        {entry.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold">
        {entry.username}
        {mine && entry.username !== 'You' && (
          <span className="text-text-secondary"> (you)</span>
        )}
        {entry.attempts > 1 && (
          <span className="block text-xs font-bold text-text-secondary">
            {entry.attempts} tries
          </span>
        )}
      </span>
      <span className="flex items-center gap-1 font-bold tabular-nums">
        <Timer className="size-4" strokeWidth={2.5} aria-hidden />
        {formatDuration(entry.timeMs)}
      </span>
    </li>
  );
}
