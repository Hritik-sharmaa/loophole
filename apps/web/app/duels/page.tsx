'use client';

import type { DuelEnd } from '@loophole/shared';
import { Flag, Swords } from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { BotOpponents } from '@/components/bot-opponents';
import { Guide } from '@/components/guide';
import { CodeEditor } from '@/components/code-editor';
import { DuelCountdown } from '@/components/duel-countdown';
import { InlineCode } from '@/components/inline-code';
import { ProgressBar } from '@/components/progress-bar';
import { SampleTests } from '@/components/sample-tests';
import { TestResults } from '@/components/test-results';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard, stickerOutline } from '@/components/ui/card';
import { celebrate } from '@/lib/celebrate';
import { useMe } from '@/lib/queries/use-me';
import { useDuelSocket, type DuelState } from '@/lib/use-duel-socket';
import { useRequireSession } from '@/lib/use-require-session';

// Live 1v1 debugging duels (J-3): queue → matched → race → one result.
// Everything that matters (grading, the winner, the clock) is decided by
// the server; this page shows its events.
export default function DuelsPage() {
  const { session, loading } = useRequireSession();
  const myId = session?.user.id ?? null;
  const { state, findDuel, leaveQueue, submit, forfeit } = useDuelSocket(
    myId,
    !loading,
  );
  const me = useMe(!loading);
  const queryClient = useQueryClient();

  // A finished duel changed ratings (S8): refresh the header, profile and
  // leaderboards.
  useEffect(() => {
    if (!state.end) return;
    if (state.end.winnerId !== null && state.end.winnerId === myId) celebrate();
    void queryClient.invalidateQueries({ queryKey: ['me'] });
    void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  }, [state.end, myId, queryClient]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {loading || state.phase === 'connecting' ? (
          <p className="text-text-secondary">Connecting to the duel server…</p>
        ) : state.phase === 'offline' ? (
          <Offline message={state.error?.message} />
        ) : state.phase === 'idle' || state.phase === 'queued' ? (
          <Lobby
            state={state}
            rating={me.data?.rating}
            onFind={findDuel}
            onCancel={leaveQueue}
          />
        ) : (
          <Room
            key={state.duelId}
            state={state}
            myId={myId}
            onSubmit={submit}
            onForfeit={forfeit}
            onPlayAgain={findDuel}
          />
        )}
        {/* Out of a duel, or the server is away: the crew (ADR-039) and
            the daily bug (ADR-035) train the same skill solo. Both are
            plain HTTP, so they work without the duel socket. */}
        {(state.phase === 'offline' ||
          state.phase === 'idle' ||
          state.phase === 'queued') && <BotOpponents />}
        {(state.phase === 'offline' ||
          state.phase === 'idle' ||
          state.phase === 'queued') && (
          <p className="mt-6 text-center">
            <Link
              href="/bug-of-the-day"
              className="rounded-badge text-sm font-bold text-text-secondary underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Or warm up with today&apos;s bug of the day
            </Link>
          </p>
        )}
      </main>
    </>
  );
}

function Lobby({
  state,
  rating,
  onFind,
  onCancel,
}: {
  state: DuelState;
  rating: number | undefined;
  onFind: () => void;
  onCancel: () => void;
}) {
  const queued = state.phase === 'queued';

  return (
    <section
      className={`${stickerCard} flex flex-col items-center gap-6 px-6 py-12 text-center`}
    >
      <div className="flex items-end gap-4">
        {/* Duels are Python (content/duels/python), so Priya hosts them. */}
        <Guide
          guide="priya"
          mood={queued ? 'thinking' : 'idle'}
          className="h-28 w-20"
        />
        <span className="flex size-14 -rotate-6 items-center justify-center rounded-card border-2 border-ink bg-pink shadow-sticker-sm">
          <Swords className="size-7" strokeWidth={2.5} aria-hidden />
        </span>
      </div>
      <span className={`${chip} bg-pink text-ink`}>Live 1v1</span>
      <h1 className="font-display text-4xl font-extrabold">Debugging duels</h1>
      <p className="max-w-md text-lg">
        You and an opponent get the same buggy program and five minutes. The
        first fix that passes every test wins.
      </p>
      {rating !== undefined && (
        <p className="font-bold">
          Your rating: <span className="font-display text-xl">{rating}</span>
        </p>
      )}

      {queued ? (
        <div role="status" className="flex flex-col items-center gap-4">
          <p className="font-bold">
            Looking for an opponent…
            {state.position !== null && state.position > 1
              ? ` (you are #${state.position} in line)`
              : ''}
          </p>
          <p className="text-sm text-text-secondary">
            Matching you with someone near your rating. The longer you wait, the
            wider the search.
          </p>
          <button type="button" onClick={onCancel} className={secondaryButton}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={onFind} className={primaryButton}>
          Find a duel
        </button>
      )}

      {state.error && (
        <p role="alert" className="font-bold">
          {state.error.message}
        </p>
      )}
    </section>
  );
}

function Room({
  state,
  myId,
  onSubmit,
  onForfeit,
  onPlayAgain,
}: {
  state: DuelState;
  myId: string | null;
  onSubmit: (code: string) => void;
  onForfeit: () => void;
  onPlayAgain: () => void;
}) {
  const { problem, opponent, endsAt, mine, theirs, end } = state;
  const [code, setCode] = useState(problem?.buggyCode ?? '');
  if (!problem || !endsAt) return null;

  const total = theirs?.totalTests ?? mine?.totalTests ?? 0;

  function giveUp() {
    if (window.confirm('Give up this duel? Your opponent wins.')) onForfeit();
  }

  return (
    <article className="flex flex-col gap-6">
      {/* DuelHeader (DESIGN_SYSTEM §6): Ink band, Orange countdown and
          opponent progress. The opponent's code is never sent (FR-20). */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-ink bg-ink px-5 py-4 text-paper shadow-sticker">
        <div className="flex min-w-48 flex-1 flex-col gap-2" aria-live="polite">
          <p className="text-sm font-bold">
            vs {opponent?.username ?? 'opponent'}
            <span className="font-medium text-border-muted">
              {' '}
              · {theirs
                ? `${theirs.testsPassed} / ${theirs.totalTests}`
                : 'no'}{' '}
              tests passing
            </span>
          </p>
          <ProgressBar
            value={theirs?.testsPassed ?? 0}
            max={total || 1}
            label="Opponent progress"
            tone="pink"
          />
        </div>
        {end ? (
          <span className="font-display text-2xl font-extrabold">Finished</span>
        ) : (
          <DuelCountdown endsAt={endsAt} />
        )}
      </header>

      {state.opponentAwaySince !== null && !end && (
        <OpponentAway since={state.opponentAwaySince} />
      )}

      {end && (
        <Outcome
          end={end}
          myId={myId}
          opponent={opponent?.username ?? 'Your opponent'}
          onPlayAgain={onPlayAgain}
        />
      )}

      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold">
          {problem.title}
        </h1>
        <p className="text-lg">
          <InlineCode text={problem.description} />
        </p>
        <p className="text-sm text-text-secondary">
          The code below has bugs. Fix it so every test passes.
        </p>
      </section>

      <SampleTests tests={problem.sampleTests} />

      <CodeEditor value={code} onChange={setCode} fileName="main.py" />

      {!end && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onSubmit(code)}
            disabled={state.submitting}
            className={primaryButton}
          >
            {state.submitting ? 'Grading…' : 'Submit fix'}
          </button>
          <button type="button" onClick={giveUp} className={secondaryButton}>
            <Flag className="size-4" strokeWidth={3} aria-hidden /> Give up
          </button>
          {mine && (
            <span className="text-sm font-bold" aria-live="polite">
              You: {mine.testsPassed} / {mine.totalTests} passing
            </span>
          )}
        </div>
      )}

      {state.error && !end && (
        <p
          role="alert"
          className="rounded-card border-2 border-ink bg-surface px-4 py-3 font-bold"
        >
          {state.error.message}
        </p>
      )}

      {state.lastResult && <TestResults result={state.lastResult} />}
    </article>
  );
}

function Outcome({
  end,
  myId,
  opponent,
  onPlayAgain,
}: {
  end: DuelEnd;
  myId: string | null;
  opponent: string;
  onPlayAgain: () => void;
}) {
  const won = end.winnerId !== null && end.winnerId === myId;
  const title =
    end.result === 'draw' ? "It's a draw" : won ? 'You won!' : 'You lost';
  const detail =
    end.result === 'draw'
      ? 'Time ran out with both of you passing the same number of tests.'
      : end.result === 'forfeit'
        ? won
          ? `${opponent} gave up.`
          : 'You gave up this one.'
        : won
          ? `You beat ${opponent}.`
          : `${opponent} won this one.`;
  const change = myId ? (end.ratingChange[myId] ?? 0) : 0;

  return (
    <section
      role="status"
      className={`${stickerOutline} flex flex-wrap items-center justify-between gap-4 px-6 py-4 ${won ? 'bg-lemon' : 'bg-paper'}`}
    >
      <Guide
        guide="priya"
        mood={won ? 'happy' : end.result === 'draw' ? 'idle' : 'oops'}
        className="h-24 w-[68px] shrink-0"
      />
      <div className="mr-auto">
        <p className="font-display text-3xl font-extrabold">{title}</p>
        <p className={won ? 'font-semibold' : 'text-text-secondary'}>
          {detail}
        </p>
        <p className="font-bold">
          {change === 0
            ? 'Rating unchanged'
            : `Rating ${change > 0 ? `+${change}` : change}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onPlayAgain} className={primaryButton}>
          Play again
        </button>
        <Link href="/learn" className={secondaryButton}>
          Back to lessons
        </Link>
      </div>
    </section>
  );
}

// FR-23: the opponent's last tab closed. The server forfeits them after
// 30 s; this only counts down so the waiting player knows.
function OpponentAway({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.ceil((since + 30_000 - now) / 1000));

  return (
    <p
      role="status"
      className="rounded-card border-2 border-ink bg-surface px-4 py-3 font-bold"
    >
      Your opponent disconnected. If they are not back in {left} s, you win.
    </p>
  );
}

function Offline({ message }: { message?: string }) {
  return (
    <div
      role="alert"
      className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-12 text-center`}
    >
      <Guide guide="priya" mood="oops" className="h-28 w-20" />
      <p className="font-display text-2xl font-extrabold">
        Can&apos;t reach the duel server
      </p>
      <p className="text-text-secondary">
        {message ?? 'Check your connection.'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={primaryButton}
      >
        Try again
      </button>
    </div>
  );
}
