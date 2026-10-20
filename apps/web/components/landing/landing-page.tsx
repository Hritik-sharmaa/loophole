'use client';

import { MotionConfig } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CrewLineup } from '@/components/guide';
import { Logo } from '@/components/logo';
import { primaryButton } from '@/components/ui/buttons';
import { chip } from '@/components/ui/card';
import { NavAuthButton } from './auth-cta';
import { DuelPreview } from './duel-preview';
import { Features } from './features';
import { Hero } from './hero';
import { PathPreview } from './path-preview';
import { Reveal } from './reveal';

// The public landing page at "/". Motion is allowed here on load and scroll
// (DESIGN_SYSTEM §5 exception); reducedMotion="user" turns it all off for
// visitors who ask for less motion.
export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo href="/" />
          <NavAuthButton />
        </nav>
      </header>

      <main className="flex-1">
        <Hero />

        {/* Lesson path */}
        <section className="border-y-2 border-ink bg-paper">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
            <Reveal className="flex flex-col items-start gap-4">
              <span className={`${chip} -rotate-2 bg-blue text-paper`}>
                The path
              </span>
              <h2 className="font-display text-4xl font-extrabold text-balance">
                A path that unlocks as you go
              </h2>
              <p className="text-lg text-text-secondary">
                Each lesson is one small exercise. Pass every test and the next
                node lights up. No videos to sit through, just you and the code.
              </p>
              <ul className="flex flex-col gap-2 font-semibold">
                <li>✓ Python from print() to functions</li>
                <li>✓ HTML & CSS with a live preview</li>
                <li>✓ JavaScript from console.log() to objects</li>
                <li>✓ Git & GitHub in a safe practice terminal</li>
                <li>✓ Instant feedback on every run</li>
                <li>✓ Hidden tests, so no shortcuts</li>
              </ul>
            </Reveal>
            <PathPreview />
          </div>
        </section>

        {/* Duels */}
        <section id="duels" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
            <div className="order-2 flex justify-center md:order-1">
              <DuelPreview />
            </div>
            <Reveal className="order-1 flex flex-col items-start gap-4 md:order-2">
              <span className={`${chip} rotate-2 bg-pink text-ink`}>
                Only on Loophole
              </span>
              <h2 className="font-display text-4xl font-extrabold text-balance">
                Live 1v1 debugging duels
              </h2>
              <p className="text-lg text-text-secondary">
                You and a rival get the same broken program and five minutes.
                Watch their progress bar climb while you hunt the bug. The
                server checks every fix and crowns exactly one winner.
              </p>
            </Reveal>
          </div>
        </section>

        <Features />

        {/* Final call to action */}
        <section className="px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-card border-2 border-ink bg-lemon px-6 py-16 text-center shadow-sticker">
            <CrewLineup mood="happy" size="lg" />
            <h2 className="font-display text-4xl font-extrabold text-balance sm:text-5xl">
              Your first lesson is waiting.
            </h2>
            <p className="max-w-md text-lg font-semibold">
              Sign up in seconds and finish your first lesson in five minutes.
            </p>
            <Link href="/login" className={primaryButton}>
              Start learning free{' '}
              <ArrowRight className="size-4" strokeWidth={3} />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-text-secondary sm:flex-row sm:px-6">
          <Logo href="/" size="sm" />
          <span>Learn to code. Then out-code your friends.</span>
        </div>
      </footer>
    </MotionConfig>
  );
}
