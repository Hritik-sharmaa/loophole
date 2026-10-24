'use client';

import type { BotDuel } from '@loophole/shared';
import { Bot, Flag, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { BOTS } from '@/components/bot-opponents';
import { CodeEditor } from '@/components/code-editor';
import { DuelCountdown } from '@/components/duel-countdown';
import { GUIDES, Guide } from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { ProgressBar } from '@/components/progress-bar';
import { SampleTests } from '@/components/sample-tests';
import { TestResults } from '@/components/test-results';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard, stickerOutline } from '@/components/ui/card';
import { celebrate } from '@/lib/celebrate';
import { formatDuration } from '@/lib/format-time';
import { languageInfo } from '@/lib/languages';
import {
  useBotDuel,
  useForfeitBotDuel,
  useStartBotDuel,
  useSubmitBotDuel,
} from '@/lib/queries/use-bot-duels';
import { useRequireSession } from '@/lib/use-require-session';
import { PageLoader } from '@/components/page-loader';

// A practice duel against a guide bot (ADR-039): the live duel's room, but
// the opponent is one of the crew fixing the same bug on a schedule. The
// server decides who finished first; no rating changes.
export default function BotDuelPage() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireSession();
  const duel = useBotDuel(id, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {loading || duel.isPending ? (
          <PageLoader label="Loading the duel…" />
        ) : duel.isError ? (
          <div
            role="alert"
            className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-12 text-center`}
          >
            <Guide guide="priya" mood="oops" className="h-28 w-20" />
            <p className="font-display text-2xl font-semibold">
              Duel not found
            </p>
            <p className="text-text-secondary">{duel.error.message}</p>
            <Link href="/duels" className={secondaryButton}>
              Back to duels
            </Link>
          </div>
        ) : (
          // key: a rematch is a new race with a fresh editor.
          <Race
            key={duel.data.id}
            duel={duel.data}
            fetchedAt={duel.dataUpdatedAt}
          />
        )}
      </main>
    </>
  );
}

// Re-renders every `ms`, for the bot's progress bar.
function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

function Race({ duel, fetchedAt }: { duel: BotDuel; fetchedAt: number }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(duel.problem.buggyCode);
  const submit = useSubmitBotDuel(duel.id);
  const forfeit = useForfeitBotDuel(duel.id);
  const now = useNow(250);
  const { name } = GUIDES[duel.opponent];
  const started = Date.parse(duel.startedAt);
  const botFinish = duel.botSchedule.at(-1) ?? 0;
  const over = duel.result !== null;

  // The bot is done by its schedule: ask the server, which marks the race
  // lost. Asks again every few seconds if the clocks disagree.
  useEffect(() => {
    if (over) return;
    const left = started + botFinish - Date.now();
    const timer = setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ['bot-duel', duel.id] }),
      left > 0 ? left + 500 : 2000,
    );
    return () => clearTimeout(timer);
  }, [over, started, botFinish, fetchedAt, queryClient, duel.id]);

  // Confetti for a win seen here, not for reopening an old one.
  const won = submit.data?.duel.result === 'won';
  useEffect(() => {
    if (won) celebrate();
  }, [won]);

  // How far the bot got: it stops where it was when the learner won.
  const botElapsed =
    duel.result === 'won'
      ? (duel.timeMs ?? 0)
      : duel.result === 'lost'
        ? botFinish
        : now - started;
  const botPassed = duel.botSchedule.filter((t) => t <= botElapsed).length;
  const mine = submit.data;

  function giveUp() {
    if (window.confirm(`Give up this duel? ${name} wins.`)) forfeit.mutate();
  }

  const error = submit.error ?? forfeit.error;

  return (
    <article className="flex flex-col gap-6">
      {/* DuelHeader (DESIGN_SYSTEM §6), with the bot's face. */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-ink bg-ink px-5 py-4 text-paper shadow-sticker">
        <span
          className="flex size-12 shrink-0 items-end justify-center overflow-hidden rounded-node border-2 border-paper"
          style={{ backgroundColor: GUIDES[duel.opponent].tint }}
        >
          <Guide
            guide={duel.opponent}
            crop="bust"
            mood={
              over ? (duel.result === 'won' ? 'oops' : 'happy') : 'thinking'
            }
            className="size-11"
          />
        </span>
        <div className="flex min-w-40 flex-1 flex-col gap-2" aria-live="polite">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
            <span>vs {name}</span>
            <span className={`${chip} bg-paper px-2 py-0 text-ink`}>
              <Bot className="size-3" strokeWidth={3} aria-hidden /> bot
            </span>
            <span className="font-medium whitespace-nowrap text-border-muted">
              {botPassed} / {duel.totalTests} tests passing
            </span>
          </p>
          <ProgressBar
            value={botPassed}
            max={duel.totalTests || 1}
            label={`${name}'s progress`}
            tone="pink"
          />
        </div>
        {over ? (
          <span className="font-display text-2xl font-semibold">Finished</span>
        ) : (
          <DuelCountdown endsAt={duel.endsAt} />
        )}
      </header>

      {over && <Outcome duel={duel} />}

      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">
          {duel.problem.title}
        </h1>
        <p className="text-lg">
          <InlineCode text={duel.problem.description} />
        </p>
        <p className="text-sm text-text-secondary">
          The code below has bugs. Fix it so every test passes before {name}{' '}
          does.
        </p>
      </section>

      <SampleTests tests={duel.problem.sampleTests} />

      <CodeEditor
        value={code}
        onChange={setCode}
        fileName={languageInfo(duel.problem.language).file}
        language={languageInfo(duel.problem.language).editor}
      />

      {!over && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => submit.mutate({ code })}
            disabled={submit.isPending || forfeit.isPending}
            className={primaryButton}
          >
            {submit.isPending ? 'Grading…' : 'Submit fix'}
          </button>
          <button
            type="button"
            onClick={giveUp}
            disabled={submit.isPending || forfeit.isPending}
            className={secondaryButton}
          >
            <Flag className="size-4" strokeWidth={3} aria-hidden /> Give up
          </button>
          {mine && (
            <span className="text-sm font-bold" aria-live="polite">
              You: {mine.testsPassed} / {mine.totalTests} passing
            </span>
          )}
        </div>
      )}

      {error && !over && (
        <p
          role="alert"
          className="rounded-card border border-border-muted bg-surface px-4 py-3 font-bold"
        >
          {error.message}
        </p>
      )}

      {mine && <TestResults result={mine} />}
    </article>
  );
}

// How the race ended, said by the bot, with a rematch against the same
// crew member (a new bug every time).
function Outcome({ duel }: { duel: BotDuel }) {
  const router = useRouter();
  const rematch = useStartBotDuel();
  const { name, cheer } = GUIDES[duel.opponent];
  const won = duel.result === 'won';
  const botTime = formatDuration(duel.botSchedule.at(-1) ?? 0);

  const title =
    duel.result === 'won'
      ? 'You won!'
      : duel.result === 'lost'
        ? `${name} fixed it first`
        : 'You gave up';
  const said =
    duel.result === 'won'
      ? `${cheer} You fixed it in ${formatDuration(duel.timeMs ?? 0)}, before me.`
      : duel.result === 'lost'
        ? `Got it in ${botTime}! Rematch? It's a new bug every time.`
        : `No problem. ${BOTS[duel.opponent].line}`;

  return (
    <section
      role="status"
      className={`${stickerOutline} flex flex-wrap items-center justify-between gap-4 px-6 py-4 ${won ? 'bg-lemon' : 'bg-paper'}`}
    >
      <Guide
        guide={duel.opponent}
        mood={won ? 'oops' : duel.result === 'lost' ? 'happy' : 'idle'}
        className="h-24 w-[68px] shrink-0"
      />
      <div className="mr-auto min-w-48 flex-1">
        <p className="font-display text-3xl font-semibold">{title}</p>
        <p className={won ? 'font-semibold' : 'text-text-secondary'}>
          <span className="font-bold">{name}:</span> “{said}”
        </p>
        <p className="text-sm font-bold">Practice duel: no rating change.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            rematch.mutate(
              { opponent: duel.opponent, language: duel.problem.language },
              {
                onSuccess: (next) => router.push(`/duels/bot/${next.id}`),
              },
            )
          }
          disabled={rematch.isPending}
          className={primaryButton}
        >
          <RotateCcw className="size-4" strokeWidth={3} aria-hidden />
          {rematch.isPending ? 'Starting…' : 'Rematch'}
        </button>
        <Link href="/duels" className={secondaryButton}>
          Back to duels
        </Link>
      </div>
      {rematch.isError && (
        <p role="alert" className="w-full font-bold">
          {rematch.error.message}
        </p>
      )}
    </section>
  );
}
