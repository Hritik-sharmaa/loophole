import type { LeagueResponse } from '@loophole/shared';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import { Guide } from '@/components/guide';
import { primaryButton } from '@/components/ui/buttons';
import { stickerCard, stickerOutline } from '@/components/ui/card';

// Weekly leagues (ADR-038): the learner's group this week, its zones, and
// how last week ended.

// Each tier's badge fill: rewards in Lemon at the top, tints below it.
const TIER_FILL = [
  'fill-orange-tint',
  'fill-surface',
  'fill-lemon',
  'fill-blue-tint',
];

export function TierBadge({
  level,
  className = 'size-14',
}: {
  level: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 48 56" aria-hidden className={className}>
      <path
        d="M24 3 L44 10 V27 C44 40 35 49 24 53 C13 49 4 40 4 27 V10 Z"
        strokeWidth={3}
        strokeLinejoin="round"
        className={`${TIER_FILL[level] ?? TIER_FILL[0]} stroke-ink`}
      />
      {/* One star per tier above Bronze. */}
      {Array.from({ length: level + 1 }, (_, i) => {
        const x = 24 + (i - level / 2) * 9;
        return (
          <path
            key={i}
            d={`M${x} 20 l1.9 3.8 4.2 0.6 -3 3 0.7 4.2 -3.8 -2 -3.8 2 0.7 -4.2 -3 -3 4.2 -0.6 Z`}
            className="fill-ink"
          />
        );
      })}
    </svg>
  );
}

// "2d 5h left", "3h 10m left" or "10m left".
function timeLeft(endsAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 60000));
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function LeagueBoard({
  league,
  myId,
  now,
}: {
  league: LeagueResponse;
  myId: string | undefined;
  // Passed in so the page decides when "now" is (render stays pure).
  now: number;
}) {
  const { tier, lastWeek, joined, members, zones } = league;
  const size = members.length;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <header className={`${stickerCard} flex items-center gap-4 px-5 py-4`}>
        <TierBadge level={tier.level} />
        <div className="flex-1">
          <h2 className="font-display text-2xl font-extrabold">
            {tier.name} league
          </h2>
          <p className="text-sm font-bold text-text-secondary">
            {timeLeft(league.endsAt, now)} · resets Monday at midnight IST
          </p>
        </div>
      </header>

      {lastWeek && lastWeek.zone !== 'stay' && (
        <section
          className={`${stickerOutline} flex items-center gap-4 px-5 py-4 ${lastWeek.zone === 'up' ? 'bg-lemon' : 'bg-surface'}`}
        >
          <Guide
            guide="priya"
            crop="bust"
            mood={lastWeek.zone === 'up' ? 'happy' : 'oops'}
            className="size-14 shrink-0"
          />
          <p className="font-bold">
            {lastWeek.zone === 'up'
              ? `You finished #${lastWeek.rank} in ${lastWeek.tier.name} and moved up to ${tier.name}!`
              : `You finished #${lastWeek.rank} of ${lastWeek.size} in ${lastWeek.tier.name} and moved down to ${tier.name}. Win it back this week!`}
          </p>
        </section>
      )}

      {!joined ? (
        <section
          className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-8 text-center`}
        >
          <Guide guide="priya" mood="thinking" className="h-24 w-[68px]" />
          <p className="font-bold">
            Earn XP this week to join a {tier.name} league of up to 20 learners.
            Finish in the top of your group to move up.
          </p>
          <Link href="/learn" className={primaryButton}>
            Start a lesson
          </Link>
        </section>
      ) : (
        <>
          <p className="text-text-secondary">
            {zones.up > 0 && `The top ${zones.up} move up`}
            {zones.up > 0 && zones.down > 0 && '; '}
            {zones.down > 0 && `the bottom ${zones.down} move down`}
            {zones.up === 0 && zones.down === 0
              ? 'Nobody moves this week: you are at the top.'
              : '.'}
          </p>
          <ol className="flex flex-col gap-2">
            {members.map((m) => {
              const mine = m.userId === myId;
              return (
                <Fragment key={m.userId}>
                  {/* The line under the promotion zone. */}
                  {m.rank === zones.up + 1 && zones.up > 0 && (
                    <ZoneLine up>Promotion zone</ZoneLine>
                  )}
                  {m.rank === size - zones.down + 1 && zones.down > 0 && (
                    <ZoneLine>Demotion zone</ZoneLine>
                  )}
                  <li
                    aria-current={mine ? 'true' : undefined}
                    className={`flex items-center gap-4 rounded-card border-2 border-ink px-5 py-3 ${mine ? 'bg-orange-tint shadow-sticker-sm' : m.zone === 'up' ? 'bg-blue-tint' : 'bg-paper'}`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-node border-2 border-ink font-display text-lg font-extrabold ${m.rank <= 3 ? 'bg-lemon' : 'bg-surface'}`}
                    >
                      {m.rank}
                    </span>
                    <span className="flex-1 truncate font-bold">
                      {m.username}
                      {mine && (
                        <span className="text-text-secondary"> (you)</span>
                      )}
                    </span>
                    {m.zone === 'up' && (
                      <ArrowUp
                        className="size-4 text-blue"
                        strokeWidth={3}
                        aria-label="moving up"
                      />
                    )}
                    {m.zone === 'down' && (
                      <ArrowDown
                        className="size-4"
                        strokeWidth={3}
                        aria-label="moving down"
                      />
                    )}
                    <span className="flex items-center gap-1 font-bold tabular-nums">
                      <Zap
                        className="size-4 text-orange-dark"
                        fill="currentColor"
                        aria-hidden
                      />
                      {m.xp} XP
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

// A labelled divider between zones. Inside the <ol>, so it is an <li>
// that screen readers read in place.
function ZoneLine({
  up = false,
  children,
}: {
  up?: boolean;
  children: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 text-xs font-bold tracking-wide uppercase ${up ? 'text-ink' : 'text-text-secondary'}`}
    >
      <span className="h-0.5 flex-1 border-t-2 border-dashed border-current" />
      {up ? `↑ ${children}` : `↓ ${children}`}
      <span className="h-0.5 flex-1 border-t-2 border-dashed border-current" />
    </li>
  );
}
