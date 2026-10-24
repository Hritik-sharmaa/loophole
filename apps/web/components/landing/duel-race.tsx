'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Avatar } from '@/components/avatar';
import { BugSticker } from '@/components/stickers';
import { primaryButton } from '@/components/ui/buttons';
import { ArrowBadge } from './auth-cta';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { SectionHead } from './section-head';

// The duel, raced live (ADR-048): when the section comes into view the
// clock runs, both players' tests pass in uneven jumps like a real duel,
// and the learner wins. It loops while visible and pauses off screen.

const YOU = 's3.dots.fluffy.black.hoodie.violet.none.cat.none.lilac';
const RIVAL = 's5.grin.fluffy.black.hoodie.sun.round.none.none.sun';
const TESTS = 5;

// When each player's next test passes, in seconds into the race.
const RIVAL_STEPS = [0.9, 2.1, 3.6, 4.4];
const YOU_STEPS = [1.3, 2.4, 2.9, 3.9, 4.8];

export function DuelRace() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const clock = { left: 300 };
        const clockText =
          root.current?.querySelector<HTMLElement>('[data-clock]');
        const count = (side: 'you' | 'rival', n: number) => {
          const el = root.current?.querySelector(`[data-count="${side}"]`);
          if (el) el.textContent = `${n}/${TESTS}`;
        };

        const tl = gsap.timeline({
          repeat: -1,
          repeatDelay: 1.6,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 65%',
            end: 'bottom top',
            toggleActions: 'play pause resume pause',
          },
        });
        tl.set('[data-bar]', { scaleX: 0 })
          .set('[data-win]', { autoAlpha: 0, y: 24, scale: 0.9 })
          .set('[data-spark]', { autoAlpha: 0, x: 0, y: 0 })
          .call(() => {
            clock.left = 300;
            count('you', 0);
            count('rival', 0);
          })
          .to(
            clock,
            {
              left: 241,
              duration: 5,
              ease: 'none',
              onUpdate: () => {
                const s = Math.ceil(clock.left);
                if (clockText)
                  clockText.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
              },
            },
            0,
          );
        RIVAL_STEPS.forEach((t, i) =>
          tl
            .to(
              '[data-bar="rival"]',
              { scaleX: (i + 1) / TESTS, duration: 0.35, ease: 'back.out(2)' },
              t,
            )
            .call(() => count('rival', i + 1), undefined, t),
        );
        YOU_STEPS.forEach((t, i) =>
          tl
            .to(
              '[data-bar="you"]',
              { scaleX: (i + 1) / TESTS, duration: 0.35, ease: 'back.out(2)' },
              t,
            )
            .call(() => count('you', i + 1), undefined, t),
        );
        tl.to(
          '[data-win]',
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(2)' },
          5.1,
        )
          .to(
            '[data-spark]',
            {
              autoAlpha: 1,
              x: () => gsap.utils.random(-140, 140),
              y: () => gsap.utils.random(-90, -10),
              rotate: () => gsap.utils.random(-200, 200),
              duration: 0.9,
              ease: 'power3.out',
            },
            5.15,
          )
          .to('[data-spark]', { autoAlpha: 0, duration: 0.4 }, 5.8)
          .to({}, { duration: 2 });
      });
      // Less motion: the finished race, still, with counts that match.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-bar="you"]', { scaleX: 1 });
        gsap.set('[data-bar="rival"]', { scaleX: 0.8 });
        gsap.set('[data-spark]', { autoAlpha: 0 });
        const set = (sel: string, text: string) => {
          const el = root.current?.querySelector(sel);
          if (el) el.textContent = text;
        };
        set('[data-count="you"]', `${TESTS}/${TESTS}`);
        set('[data-count="rival"]', `${TESTS - 1}/${TESTS}`);
        set('[data-clock]', '4:01');
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="duel"
      className="relative scroll-mt-16 overflow-hidden bg-gradient-to-br from-[#5a3ee0] via-violet to-violet-deep text-paper"
    >
      {/* Wavy edges: the band flows out of the canvas above and into the
          avatar section's butter below, instead of a hard stripe. */}
      <Wave className="top-0 fill-canvas" />
      <Wave className="bottom-0 rotate-180 fill-[#fff6dc]" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-28 pb-32 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="flex flex-col items-start gap-6">
          <SectionHead
            dark
            label="Duels, only on Loophole"
            title={
              <>
                Same bug.
                <br />
                Five minutes.
                <br />
                <span className="text-sun">First fix wins.</span>
              </>
            }
          />
          <p className="max-w-[42ch] text-lg text-violet-tint">
            You and a rival get the same broken program. Every fix you submit
            runs against the tests, and the server decides who got there first.
            Nobody around? Race Meera, Arjun or Harpreet.
          </p>
          <Link href="/login" className={`${primaryButton} pr-5`}>
            Find a duel <ArrowBadge />
          </Link>
        </div>

        <div aria-hidden className="relative">
          <div className="rounded-[2rem] bg-paper p-5 text-ink shadow-[0_40px_70px_-40px_rgb(10_5_40/0.8)] sm:p-6">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-display font-semibold">
                <BugSticker className="size-6" /> Average of a list
              </p>
              <span
                data-clock
                className="rounded-full bg-ink px-3 py-1 font-mono text-sm font-semibold text-sun tabular-nums"
              >
                5:00
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <Racer code={RIVAL} name="Arjun" side="rival" />
              <Racer code={YOU} name="You" side="you" />
            </div>
            <pre className="mt-5 overflow-hidden rounded-2xl bg-ink px-4 py-3 font-mono text-xs leading-6 text-canvas sm:text-sm">
              <span className="text-sun">def</span> average(nums):{'\n'}
              {'    '}
              <span className="text-sun">return</span> sum(nums) /{' '}
              <span className="rounded bg-pink/30 px-1 text-pink">
                len(nums) - 1
              </span>
            </pre>
          </div>

          <div
            data-win
            className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-sun py-2 pr-5 pl-2 font-bold whitespace-nowrap text-ink shadow-sun"
          >
            <Avatar code={YOU} className="size-9 border-2 border-paper" />
            You fixed it first!{' '}
            <span className="text-violet-deep">+18 rating</span>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                data-spark
                className={`absolute top-1/2 left-1/2 size-2.5 rounded-[3px] ${['bg-paper', 'bg-pink', 'bg-tile-mint', 'bg-violet'][i % 4]}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Racer({
  code,
  name,
  side,
}: {
  code: string;
  name: string;
  side: 'you' | 'rival';
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar code={code} className="size-11" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between text-sm font-bold">
          <span>{name}</span>
          <span data-count={side} className="text-text-secondary tabular-nums">
            0/{TESTS}
          </span>
        </div>
        <div className="h-3.5 overflow-hidden rounded-full bg-surface">
          <div
            data-bar={side}
            className={`h-full origin-left rounded-full ${side === 'you' ? 'bg-sun' : 'bg-pink'}`}
          />
        </div>
      </div>
    </div>
  );
}

// A soft wave across the full width; rotate it for the bottom edge.
function Wave({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 h-12 w-full sm:h-20 ${className}`}
    >
      <path d="M0 0 H1440 V34 C1200 78 960 8 720 40 C480 72 240 6 0 44 Z" />
    </svg>
  );
}
