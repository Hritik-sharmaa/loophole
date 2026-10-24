'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { CrewLineup } from '@/components/guide';
import { primaryButton } from '@/components/ui/buttons';
import { ArrowBadge } from './auth-cta';
import { gsap, MOTION_OK, useGSAP } from './gsap';

// The last call to start (ADR-048). An Ink card that ends where the hero
// began: a terminal runs the first lesson's program, the tests pass and
// the XP lands, next to the one button. The terminal types itself out
// once when the card comes into view.

export function ClosingCta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({
            scrollTrigger: { trigger: '[data-closing]', start: 'top 75%' },
          })
          .fromTo(
            '[data-closing]',
            { y: 40, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out' },
          )
          .fromTo(
            '[data-term-line]',
            { autoAlpha: 0, x: -8 },
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.3,
              stagger: 0.45,
              ease: 'power2.out',
            },
            '-=0.2',
          );
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28"
    >
      <div
        data-closing
        className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-ink p-8 text-paper sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:p-16"
      >
        <div className="flex flex-col items-start gap-6">
          <CrewLineup size="sm" mood="happy" />
          <h2 className="font-display text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl">
            Your first lesson takes{' '}
            <span className="text-sun">five minutes.</span>
          </h2>
          <p className="max-w-[40ch] text-lg text-violet-tint/80">
            Free, in English or Hinglish, on your phone or laptop. Priya is
            already waiting with <span className="font-mono">print()</span>.
          </p>
          <Link href="/login" className={`${primaryButton} pr-5 text-base`}>
            Start learning free <ArrowBadge />
          </Link>
        </div>

        {/* The first lesson's program, run in a terminal. */}
        <div
          aria-hidden
          className="rounded-3xl border border-paper/10 bg-screen p-5 font-mono text-sm leading-7 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] sm:p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-pink" />
            <span className="size-2.5 rounded-full bg-sun" />
            <span className="size-2.5 rounded-full bg-tile-mint" />
            <span className="ml-2 text-xs text-text-tertiary">hello.py</span>
          </div>
          <p data-term-line>
            <span className="text-sun">print</span>(
            <span className="text-tile-mint">&quot;Hello, world&quot;</span>)
          </p>
          <p data-term-line className="text-text-tertiary">
            <span className="text-violet-tint/60">$</span> python hello.py
          </p>
          <p data-term-line>Hello, world</p>
          <p data-term-line className="mt-3 text-tile-mint">
            ✓ All tests passed
          </p>
          <p data-term-line className="flex items-center gap-1 text-sun">
            +15 XP · lesson 1 of 40 done
            <span className="ml-1 inline-block h-4 w-2 animate-blink bg-sun" />
          </p>
        </div>
      </div>
    </section>
  );
}
