'use client';

import type { DuelReplay, DuelReplayEvent } from '@loophole/shared';
import {
  Lock,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { CodeEditor } from '@/components/code-editor';
import { OUTCOME } from '@/components/duel-history';
import { Guide, guideFor } from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { ProgressBar } from '@/components/progress-bar';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';
import { languageInfo } from '@/lib/languages';
import { useDuelReplay } from '@/lib/queries/use-duel-history';
import { useRequireSession } from '@/lib/use-require-session';
import { PageLoader } from '@/components/page-loader';

// Playback speeds; a five-minute duel takes 30 s at 10×.
const SPEEDS = [1, 5, 10] as const;

// "1:05": a moment in the duel.
function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// A finished duel played back (FR-27, ADR-041): both players' scores over
// time and the learner's own code at each attempt. The opponent's code is
// never sent (hard rule 2).
export default function DuelReplayPage() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireSession();
  const replay = useDuelReplay(id, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {loading || replay.isPending ? (
          <PageLoader label="Loading the replay…" />
        ) : replay.isError ? (
          <div
            role="alert"
            className={`${stickerCard} mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-12 text-center`}
          >
            <Guide guide="priya" mood="oops" className="h-28 w-20" />
            <p className="font-display text-2xl font-semibold">
              No replay here
            </p>
            <p className="text-text-secondary">{replay.error.message}</p>
            <Link href="/duels" className={secondaryButton}>
              Back to duels
            </Link>
          </div>
        ) : (
          <Player replay={replay.data} />
        )}
      </main>
    </>
  );
}

// What happened at the end, worked out from the result and the scores.
function endLine(replay: DuelReplay): string {
  const { outcome, result, opponent, events, totalTests } = replay;
  if (result === 'draw') return "Time's up: a draw.";
  if (result === 'forfeit') {
    return outcome === 'won'
      ? `${opponent} gave up or left: you won.`
      : 'You gave up or left.';
  }
  const winner = outcome === 'won' ? 'me' : 'opponent';
  const best = Math.max(
    0,
    ...events.filter((e) => e.who === winner).map((e) => e.testsPassed),
  );
  if (best === totalTests) {
    return outcome === 'won'
      ? 'Every test passed: you won!'
      : `${opponent} passed every test first.`;
  }
  return outcome === 'won'
    ? "Time's up: you passed the most tests and won."
    : `Time's up: ${opponent} passed the most tests.`;
}

function Player({ replay }: { replay: DuelReplay }) {
  const { durationMs, events, totalTests, opponent, problem } = replay;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(5);
  const atEnd = t >= durationMs;
  const running = playing && !atEnd;

  // Moves the clock while playing; stops by itself at the end.
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const step = (now - last) * speed;
      last = now;
      setT((prev) => Math.min(durationMs, prev + step));
    }, 100);
    return () => clearInterval(timer);
  }, [running, speed, durationMs]);

  const past = events.filter((e) => e.atMs <= t);
  const latest = (who: DuelReplayEvent['who']) =>
    past.filter((e) => e.who === who).at(-1);
  const mine = latest('me');
  const theirs = latest('opponent');
  const current = past.at(-1);

  function jump(to: number) {
    setPlaying(false);
    setT(Math.max(0, Math.min(durationMs, to)));
  }
  function playPause() {
    if (atEnd) {
      setT(0);
      setPlaying(true);
    } else {
      setPlaying(!playing);
    }
  }
  const prev = [...events].reverse().find((e) => e.atMs < t)?.atMs ?? 0;
  const next = events.find((e) => e.atMs > t)?.atMs ?? durationMs;
  const { label, tone } = OUTCOME[replay.outcome];

  return (
    // Wide screens: what happened on the left, the code on the right.
    <article className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-card border border-ink bg-ink px-5 py-4 text-paper shadow-sticker">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-2 font-bold">
              <span className={`${chip} bg-pink text-ink`}>Replay</span>
              vs {opponent}
              <span className={`${chip} ${tone} text-ink`}>{label}</span>
            </p>
            <p
              className="font-display text-2xl font-semibold text-sun tabular-nums"
              aria-label={`At ${clock(t)} of ${clock(durationMs)}`}
            >
              {clock(t)}
              <span className="text-base text-border-muted">
                {' '}
                / {clock(durationMs)}
              </span>
            </p>
          </div>
          <Score
            who="You"
            passed={mine?.testsPassed ?? 0}
            total={totalTests}
            tone="orange"
          />
          <Score
            who={opponent}
            passed={theirs?.testsPassed ?? 0}
            total={totalTests}
            tone="pink"
          />
        </header>

        {/* Controls: play, scrub, step between attempts, speed. */}
        <section
          aria-label="Replay controls"
          className={`${stickerCard} flex flex-col gap-4 p-4`}
        >
          <input
            type="range"
            min={0}
            max={durationMs}
            step={100}
            value={t}
            onChange={(e) => jump(Number(e.target.value))}
            aria-label="Replay position"
            aria-valuetext={`${clock(t)} of ${clock(durationMs)}`}
            className="w-full accent-sun"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Prev, play and next stay together on one line. */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => jump(prev)}
                aria-label="Previous attempt"
                className={secondaryButton}
              >
                <SkipBack className="size-4" strokeWidth={3} aria-hidden />
              </button>
              <button
                type="button"
                onClick={playPause}
                className={primaryButton}
              >
                {atEnd ? (
                  <>
                    <RotateCcw className="size-4" strokeWidth={3} aria-hidden />{' '}
                    Watch again
                  </>
                ) : running ? (
                  <>
                    <Pause className="size-4" strokeWidth={3} aria-hidden />{' '}
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="size-4" strokeWidth={3} aria-hidden /> Play
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => jump(next)}
                aria-label="Next attempt"
                className={secondaryButton}
              >
                <SkipForward className="size-4" strokeWidth={3} aria-hidden />
              </button>
            </div>
            <div
              role="group"
              aria-label="Speed"
              className="flex gap-1 rounded-card border border-border-muted p-1"
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={speed === s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-badge px-3 py-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet ${speed === s ? 'bg-ink text-paper' : 'text-text-secondary hover:text-ink'}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="timeline-heading"
          className="flex flex-col gap-3"
        >
          <h2 id="timeline-heading" className="font-display text-xl font-bold">
            What happened
          </h2>
          <ol className="flex flex-col gap-2">
            <TimelineItem at={0} active={!current} onPick={jump}>
              The duel starts: same buggy program, five minutes.
            </TimelineItem>
            {events.map((e, i) => (
              <TimelineItem
                key={i}
                at={e.atMs}
                active={e === current && !atEnd}
                onPick={jump}
              >
                <span className="font-bold">
                  {e.who === 'me' ? 'You' : opponent}
                </span>{' '}
                submitted: {e.testsPassed} / {e.totalTests} tests passing
              </TimelineItem>
            ))}
            <TimelineItem at={durationMs} active={atEnd} onPick={jump}>
              <span className="font-bold">{endLine(replay)}</span>
            </TimelineItem>
          </ol>
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Lock className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {opponent}&apos;s code stays private: a replay shows only their
            scores.
          </p>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-semibold">
            {problem.title}
          </h2>
          <p className="text-lg">
            <InlineCode text={problem.description} />
          </p>
        </section>

        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 font-bold" aria-live="polite">
            <Guide
              guide={guideFor(problem.language)}
              crop="bust"
              mood={mine?.testsPassed === totalTests ? 'happy' : 'thinking'}
              className="size-9"
            />
            {mine
              ? `Your code at ${clock(mine.atMs)}: ${mine.testsPassed} / ${mine.totalTests} passing`
              : 'The buggy program, before your first attempt'}
          </p>
          <CodeEditor
            value={mine?.code ?? problem.buggyCode}
            fileName={languageInfo(problem.language).file}
            language={languageInfo(problem.language).editor}
            readOnly
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/duels" className={primaryButton}>
            Duel again
          </Link>
          <Link href="/learn" className={secondaryButton}>
            Back to lessons
          </Link>
        </div>
      </div>
    </article>
  );
}

function Score({
  who,
  passed,
  total,
  tone,
}: {
  who: string;
  passed: number;
  total: number;
  tone: 'orange' | 'pink';
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 truncate text-sm font-bold">{who}</span>
      <div className="flex-1">
        <ProgressBar
          value={passed}
          max={total || 1}
          label={`${who}: tests passing`}
          tone={tone}
        />
      </div>
      <span className="w-12 text-right text-sm font-bold tabular-nums">
        {passed} / {total}
      </span>
    </div>
  );
}

function TimelineItem({
  at,
  active,
  onPick,
  children,
}: {
  at: number;
  active: boolean;
  onPick: (at: number) => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(at)}
        aria-current={active ? 'step' : undefined}
        className={`flex w-full items-center gap-3 rounded-card border border-border-muted px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet ${active ? 'bg-sun-tint shadow-sticker-sm' : 'bg-paper hover:bg-surface'}`}
      >
        <span className="w-10 shrink-0 font-mono text-sm font-bold tabular-nums">
          {clock(at)}
        </span>
        <span>{children}</span>
      </button>
    </li>
  );
}
