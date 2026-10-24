'use client';

import type {
  DailyBugBoard as Board,
  DailyBugResult,
  DailyBugToday,
} from '@loophole/shared';
import { Bug, RotateCcw, Timer } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { CodeEditor } from '@/components/code-editor';
import { DailyBugBoard } from '@/components/daily-bug-board';
import { GUIDES, Guide, GuideSays } from '@/components/guide';
import { SampleTests } from '@/components/sample-tests';
import { TestResults } from '@/components/test-results';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';
import { celebrate } from '@/lib/celebrate';
import { formatDuration, nextIstMidnight } from '@/lib/format-time';
import {
  useDailyBug,
  useDailyBugBoard,
  useSubmitDailyBug,
} from '@/lib/queries/use-daily-bug';
import { useMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

// The bug pool is Python (content/duels/python), so Priya hosts it.
const HOST = 'priya';

// What a solve pays (ADR-035; the server decides, this only labels it).
const DAILY_BUG_XP = 20;

// Bug of the day (FR-28, ADR-035): one buggy program a day for everyone.
// Opening this page starts the learner's clock (the server keeps the
// time); the first fix that passes every test stops it.
export default function BugOfTheDayPage() {
  const { loading } = useRequireSession();
  const today = useDailyBug(!loading);
  // After today's bug, so the board knows the clock has started.
  const board = useDailyBugBoard(!loading && today.isSuccess);
  const me = useMe(!loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {loading || today.isPending ? (
          <p className="text-text-secondary">Loading today&apos;s bug…</p>
        ) : today.isError ? (
          <div
            role="alert"
            className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-12 text-center`}
          >
            <Guide guide={HOST} mood="oops" className="h-28 w-20" />
            <p className="font-display text-2xl font-semibold">No bug today</p>
            <p className="text-text-secondary">{today.error.message}</p>
            <Link href="/learn" className={secondaryButton}>
              Back to learning
            </Link>
          </div>
        ) : (
          // key: a new IST day is a new bug with a fresh editor.
          <DailyBug
            key={today.data.day}
            today={today.data}
            board={board.data}
          />
        )}
        {board.data && <DailyBugBoard board={board.data} myId={me.data?.id} />}
      </main>
    </>
  );
}

// Re-renders every `ms`, for the running clock and the countdown.
function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

function DailyBug({
  today,
  board,
}: {
  today: DailyBugToday;
  board: Board | undefined;
}) {
  const { problem, me } = today;
  const [code, setCode] = useState(problem.buggyCode);
  const submit = useSubmitDailyBug();
  const result = submit.data;
  const now = useNow(1000);

  // Solved now, or on an earlier visit today.
  const solvedMs = result?.solved ? result.timeMs : me.timeMs;
  const nextBugIn = nextIstMidnight(today.day).getTime() - now;
  const runningMs = now - new Date(me.openedAt).getTime();

  useEffect(() => {
    if (result && result.xpAwarded > 0) celebrate();
  }, [result]);

  return (
    <>
      <header className={`${stickerCard} flex flex-col gap-3 p-5`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${chip} bg-pink text-ink`}>
            <Bug className="size-3.5" strokeWidth={3} aria-hidden /> Bug of the
            day
          </span>
          <span className={`${chip} bg-lemon text-ink tabular-nums`}>
            New bug in {formatDuration(nextBugIn)}
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
          {problem.title}
        </h1>
        <p className="text-lg">{problem.description}</p>
      </header>

      {solvedMs !== null ? (
        <Squashed
          timeMs={solvedMs}
          result={result}
          rank={result?.rank ?? board?.me?.rank ?? null}
          solvers={result?.solvers ?? board?.solvers ?? null}
          nextBugIn={nextBugIn}
        />
      ) : (
        <>
          <GuideSays
            guide={HOST}
            mood={result ? 'oops' : 'thinking'}
            speak="Something in this program is broken. Fix it as fast as you can: your clock started when you opened it."
          >
            <p className="text-lg">
              Something in this program is broken, maybe in more than one place.
              Fix it as fast as you can: your clock started when you opened it.
            </p>
            <p
              className={`${chip} mt-2 bg-paper text-ink tabular-nums`}
              aria-label={`Your time so far: ${formatDuration(runningMs)}`}
            >
              <Timer className="size-3.5" strokeWidth={3} aria-hidden />
              {formatDuration(runningMs)}
            </p>
          </GuideSays>

          <SampleTests tests={problem.sampleTests} />
          <CodeEditor
            value={code}
            onChange={setCode}
            fileName="bug.py"
            language="python"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => submit.mutate({ code })}
              disabled={submit.isPending}
              className={primaryButton}
            >
              {submit.isPending ? 'Grading…' : 'Submit fix'}
            </button>
            <button
              type="button"
              onClick={() => setCode(problem.buggyCode)}
              disabled={submit.isPending || code === problem.buggyCode}
              className={secondaryButton}
            >
              <RotateCcw className="size-4" strokeWidth={3} aria-hidden /> Start
              over
            </button>
          </div>
          {submit.isError && (
            <p
              role="alert"
              className="rounded-card border border-border-muted bg-surface px-4 py-3 font-bold"
            >
              {submit.error.message}
            </p>
          )}
          {result && <TestResults result={result} />}
        </>
      )}
    </>
  );
}

// The finish state, like a lesson's (ADR-029): Priya cheering, the time,
// the place on today's board and the XP.
function Squashed({
  timeMs,
  result,
  rank,
  solvers,
  nextBugIn,
}: {
  timeMs: number;
  result: DailyBugResult | undefined;
  rank: number | null;
  solvers: number | null;
  nextBugIn: number;
}) {
  const { name, cheer, tint } = GUIDES[HOST];
  const paid = result?.xpAwarded ?? 0;

  return (
    <section
      role="status"
      className={`${stickerCard} flex flex-col items-center gap-5 overflow-hidden px-6 pb-8 text-center`}
    >
      <div
        className="-mx-6 flex w-[calc(100%+3rem)] justify-center border-b border-border-muted pt-6"
        style={{ backgroundColor: tint }}
      >
        <Guide
          guide={HOST}
          mood="happy"
          label={`${name} cheering`}
          className="h-48 w-[137px]"
        />
      </div>
      <h2 className="font-display text-4xl font-semibold">Bug squashed!</h2>
      <p className="text-lg">
        <span className="font-bold">{name}:</span> “{cheer} You fixed it in{' '}
        <span className="font-bold">{formatDuration(timeMs)}</span>.”
      </p>

      <dl className="grid w-full max-w-md grid-cols-3 gap-3">
        <Stat
          label="Time"
          head="bg-pink text-ink"
          value={formatDuration(timeMs)}
        />
        <Stat
          label="Place"
          head="bg-lemon text-ink"
          value={rank === null ? '…' : `#${rank}`}
          note={solvers === null ? undefined : `of ${solvers} today`}
        />
        <Stat
          label="XP"
          head="bg-violet text-paper"
          value={`+${result ? paid : DAILY_BUG_XP}`}
          note={
            !result
              ? 'Paid when you fixed it'
              : paid === 0
                ? 'Paid once a day'
                : undefined
          }
        />
      </dl>

      <p className="font-bold text-text-secondary">
        A new bug arrives in {formatDuration(nextBugIn)}.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/learn" className={`${primaryButton} uppercase`}>
          Keep learning
        </Link>
        <Link href="/duels" className={secondaryButton}>
          Try a live duel
        </Link>
      </div>
    </section>
  );
}

function Stat({
  label,
  head,
  value,
  note,
}: {
  label: string;
  head: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-border-muted">
      <dt
        className={`px-2 py-1 text-xs font-bold tracking-wide uppercase ${head}`}
      >
        {label}
      </dt>
      <dd className="px-2 py-2 font-display text-2xl font-semibold tabular-nums">
        {value}
        {note && (
          <span className="block font-sans text-xs font-bold text-text-secondary">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}
