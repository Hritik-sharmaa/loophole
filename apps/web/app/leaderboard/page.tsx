'use client';

import type { WeeklyLeaderboard } from '@loophole/shared';
import { Zap } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { useWeeklyLeaderboard } from '@/lib/queries/use-leaderboard';
import { useMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

// FR-11: this week's XP ranking. Resets Monday 00:00 IST.
export default function LeaderboardPage() {
  const { loading } = useRequireSession();
  const board = useWeeklyLeaderboard(!loading);
  // Only to highlight the user's own row.
  const me = useMe(!loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-display text-4xl font-extrabold">This week</h1>
        {loading || board.isPending ? (
          <p className="mt-6 text-text-secondary">Loading the leaderboard…</p>
        ) : board.isError ? (
          <p role="alert" className="mt-6">
            ✕ Could not load the leaderboard: {board.error.message}
          </p>
        ) : (
          <Board board={board.data} myId={me.data?.id} />
        )}
      </main>
    </>
  );
}

function Board({
  board,
  myId,
}: {
  board: WeeklyLeaderboard;
  myId: string | undefined;
}) {
  const { entries, me, weekStart } = board;
  const onBoard = entries.some((e) => e.userId === myId);

  return (
    <div className="mt-2 flex flex-col gap-6">
      <p className="text-text-secondary">
        XP earned since {formatWeekStart(weekStart)}. Resets every Monday at
        midnight IST.
      </p>

      {entries.length === 0 ? (
        <p className="rounded-card bg-surface px-6 py-10 text-center font-bold">
          No XP yet this week. Finish a lesson to take first place.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e) => (
            <Row
              key={e.userId}
              rank={e.rank}
              name={e.username}
              xp={e.xp}
              mine={e.userId === myId}
            />
          ))}
        </ol>
      )}

      {/* FR-11: the user's own rank is always shown, even outside the top 50. */}
      {!onBoard && (
        <p className="rounded-card border-2 border-ink px-5 py-3 font-bold">
          {me.rank === null
            ? 'You have no XP this week yet.'
            : `You are #${me.rank} with ${me.xp} XP.`}
        </p>
      )}
    </div>
  );
}

function Row({
  rank,
  name,
  xp,
  mine,
}: {
  rank: number;
  name: string;
  xp: number;
  mine: boolean;
}) {
  return (
    <li
      aria-current={mine ? 'true' : undefined}
      className={`flex items-center gap-4 rounded-card px-5 py-3 ${mine ? 'border-2 border-ink bg-paper' : 'bg-surface'}`}
    >
      <span className="w-8 font-display text-xl font-extrabold">{rank}</span>
      <span className="flex-1 truncate font-bold">
        {name}
        {mine && <span className="text-text-secondary"> (you)</span>}
      </span>
      <span className="flex items-center gap-1 font-bold">
        <Zap className="size-4 text-orange" fill="currentColor" aria-hidden />
        {xp} XP
      </span>
    </li>
  );
}

// "Monday, 12 October": the IST calendar day the week began.
function formatWeekStart(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });
}
