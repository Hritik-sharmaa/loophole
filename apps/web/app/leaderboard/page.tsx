'use client';

import type { RatingLeaderboard, WeeklyLeaderboard } from '@loophole/shared';
import { Swords, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { Guide } from '@/components/guide';
import {
  useRatingLeaderboard,
  useWeeklyLeaderboard,
} from '@/lib/queries/use-leaderboard';
import { useMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

type Tab = 'weekly' | 'rating';

// Two boards: this week's XP (FR-11, resets Monday 00:00 IST) and duel
// rating (FR-24).
export default function LeaderboardPage() {
  const { loading } = useRequireSession();
  const [tab, setTab] = useState<Tab>('weekly');
  const weekly = useWeeklyLeaderboard(!loading && tab === 'weekly');
  const rating = useRatingLeaderboard(!loading && tab === 'rating');
  // Only to highlight the user's own row.
  const me = useMe(!loading);
  const board = tab === 'weekly' ? weekly : rating;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-4xl font-extrabold">Leaderboard</h1>

        <div
          role="tablist"
          aria-label="Leaderboard"
          className="mt-4 inline-flex gap-1 rounded-card border-2 border-ink bg-paper p-1"
        >
          <TabButton active={tab === 'weekly'} onClick={() => setTab('weekly')}>
            This week
          </TabButton>
          <TabButton active={tab === 'rating'} onClick={() => setTab('rating')}>
            Duel rating
          </TabButton>
        </div>

        {loading || board.isPending ? (
          <p className="mt-6 text-text-secondary">Loading the leaderboard…</p>
        ) : board.isError ? (
          <p role="alert" className="mt-6">
            ✕ Could not load the leaderboard: {board.error.message}
          </p>
        ) : tab === 'weekly' && weekly.data ? (
          <WeeklyBoard board={weekly.data} myId={me.data?.id} />
        ) : rating.data ? (
          <RatingBoard board={rating.data} myId={me.data?.id} />
        ) : null}
      </main>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-badge px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${active ? 'bg-ink text-paper' : 'text-text-secondary hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function WeeklyBoard({
  board,
  myId,
}: {
  board: WeeklyLeaderboard;
  myId: string | undefined;
}) {
  const { entries, me, weekStart } = board;
  const xp = (value: number) => (
    <>
      <Zap
        className="size-4 text-orange-dark"
        fill="currentColor"
        aria-hidden
      />
      {value} XP
    </>
  );

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="text-text-secondary">
        XP earned since {formatWeekStart(weekStart)}. Resets every Monday at
        midnight IST.
      </p>
      <Rows
        entries={entries.map((e) => ({ ...e, value: xp(e.xp) }))}
        myId={myId}
        empty="No XP yet this week. Finish a lesson to take first place."
      />
      {/* FR-11: the user's own rank is always shown, even outside the top 50. */}
      {!entries.some((e) => e.userId === myId) && (
        <MyRank>
          {me.rank === null
            ? 'You have no XP this week yet.'
            : `You are #${me.rank} with ${me.xp} XP.`}
        </MyRank>
      )}
    </div>
  );
}

function RatingBoard({
  board,
  myId,
}: {
  board: RatingLeaderboard;
  myId: string | undefined;
}) {
  const { entries, me } = board;
  const elo = (value: number) => (
    <>
      <Swords className="size-4 text-ink" aria-hidden />
      {value}
    </>
  );

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="text-text-secondary">
        Elo rating from duels. Everyone starts at 1200; beating a stronger
        player earns more.
      </p>
      <Rows
        entries={entries.map((e) => ({ ...e, value: elo(e.elo) }))}
        myId={myId}
        empty="No duels finished yet. Win one to take first place."
      />
      {!entries.some((e) => e.userId === myId) && (
        <MyRank>
          {me.rank === null
            ? `You are at ${me.elo}. Finish a duel to get ranked.`
            : `You are #${me.rank} with ${me.elo}.`}
        </MyRank>
      )}
    </div>
  );
}

function Rows({
  entries,
  myId,
  empty,
}: {
  entries: {
    rank: number;
    userId: string;
    username: string;
    value: ReactNode;
  }[];
  myId: string | undefined;
  empty: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border-2 border-ink bg-paper px-6 py-10 text-center font-bold">
        <Guide guide="priya" mood="thinking" className="h-24 w-[68px]" />
        <p>{empty}</p>
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e) => {
        const mine = e.userId === myId;
        return (
          <li
            key={e.userId}
            aria-current={mine ? 'true' : undefined}
            className={`flex items-center gap-4 rounded-card border-2 border-ink px-5 py-3 ${mine ? 'bg-orange-tint shadow-sticker-sm' : 'bg-paper'}`}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-node border-2 border-ink font-display text-lg font-extrabold ${e.rank <= 3 ? 'bg-lemon' : 'bg-surface'}`}
            >
              {e.rank}
            </span>
            <span className="flex-1 truncate font-bold">
              {e.username}
              {mine && <span className="text-text-secondary"> (you)</span>}
            </span>
            <span className="flex items-center gap-1 font-bold">{e.value}</span>
          </li>
        );
      })}
    </ol>
  );
}

function MyRank({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border-2 border-ink bg-orange-tint px-5 py-3 font-bold">
      {children}
    </p>
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
