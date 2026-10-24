'use client';

import type { BotOpponent, DuelLanguage } from '@loophole/shared';
import { useRouter } from 'next/navigation';
import { duelLanguageName } from '@/components/duel-language-picker';
import { GUIDES, Guide } from '@/components/guide';
import { primaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';
import { useStartBotDuel } from '@/lib/queries/use-bot-duels';

// The crew a learner can race (ADR-039). The paces are the server's
// (modules/bot-duels/bot-duel-rules.ts); these only describe them.
export const BOTS: Record<
  BotOpponent,
  { level: string; levelTone: string; pace: string; line: string }
> = {
  meera: {
    level: 'Easy',
    levelTone: 'bg-violet-tint',
    pace: 'about 4 minutes',
    line: "I'll take it slow. Promise!",
  },
  arjun: {
    level: 'Medium',
    levelTone: 'bg-lemon',
    pace: 'about 3 minutes',
    line: "Let's see who's faster.",
  },
  harpreet: {
    level: 'Hard',
    levelTone: 'bg-pink',
    pace: 'about 2 minutes',
    line: "Ready? I don't wait!",
  },
};

// "Practice with the crew" on the duels page: always there, even when
// nobody else is online or the duel server is away (it is plain HTTP).
// The race is in the language picked at the top of the page (ADR-040).
export function BotOpponents({ language }: { language: DuelLanguage }) {
  const router = useRouter();
  const start = useStartBotDuel();

  function race(opponent: BotOpponent) {
    start.mutate(
      { opponent, language },
      { onSuccess: (duel) => router.push(`/duels/bot/${duel.id}`) },
    );
  }

  return (
    <section
      aria-labelledby="crew-heading"
      className="mt-8 flex flex-col gap-4"
    >
      <div>
        <h2 id="crew-heading" className="font-display text-2xl font-semibold">
          Practice with the crew
        </h2>
        <p className="text-text-secondary">
          Nobody around? Race one of us on a real {duelLanguageName(language)}{' '}
          duel problem. No rating change, just practice.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(BOTS) as BotOpponent[]).map((id) => {
          const bot = BOTS[id];
          const { name, tint } = GUIDES[id];
          const busy = start.isPending && start.variables?.opponent === id;
          return (
            <li
              key={id}
              className={`${stickerCard} flex overflow-hidden sm:flex-col`}
            >
              {/* A row on phones, a column card from sm up. */}
              <div
                className="flex w-24 shrink-0 items-end justify-center border-r border-border-muted pt-3 sm:w-auto sm:border-r-0 sm:border-b sm:pt-4"
                style={{ backgroundColor: tint }}
              >
                <Guide guide={id} mood="idle" className="h-28 w-20" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-xl font-semibold">{name}</p>
                  <span className={`${chip} ${bot.levelTone} text-ink`}>
                    {bot.level}
                  </span>
                </div>
                <p className="text-sm">“{bot.line}”</p>
                <p className="text-sm text-text-secondary">
                  Fixes a bug in {bot.pace}.
                </p>
                <button
                  type="button"
                  onClick={() => race(id)}
                  disabled={start.isPending}
                  className={`${primaryButton} mt-auto`}
                >
                  {busy ? 'Starting…' : `Race ${name}`}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {start.isError && (
        <p
          role="alert"
          className="rounded-card border border-border-muted bg-surface px-4 py-3 font-bold"
        >
          {start.error.message}
        </p>
      )}
    </section>
  );
}
