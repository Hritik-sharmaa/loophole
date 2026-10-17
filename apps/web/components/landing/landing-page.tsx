'use client';

import { MotionConfig } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { invertedButton } from '@/components/ui/buttons';
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
      <header className="sticky top-0 z-20 border-b border-surface bg-paper/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            loop<span className="text-orange">hole</span>
          </Link>
          <NavAuthButton />
        </nav>
      </header>

      <main className="flex-1">
        <Hero />

        {/* Lesson path */}
        <section className="bg-surface/50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
            <Reveal className="flex flex-col gap-4">
              <h2 className="font-display text-4xl font-extrabold">
                A path that unlocks as you go
              </h2>
              <p className="text-lg text-text-secondary">
                Each lesson is one small exercise. Pass every test and the next
                node lights up. No videos to sit through, just you and the code.
              </p>
              <ul className="flex flex-col gap-2 font-semibold">
                <li>✓ Python from print() to functions</li>
                <li>✓ Instant feedback on every run</li>
                <li>✓ Hidden tests, so no shortcuts</li>
              </ul>
            </Reveal>
            <PathPreview />
          </div>
        </section>

        {/* Duels */}
        <section id="duels" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
            <div className="order-2 flex justify-center md:order-1">
              <DuelPreview />
            </div>
            <Reveal className="order-1 flex flex-col gap-4 md:order-2">
              <span className="w-fit rounded-badge bg-ink px-3 py-1 text-xs font-bold tracking-wide text-paper uppercase">
                Only on Loophole
              </span>
              <h2 className="font-display text-4xl font-extrabold">
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
        <section className="px-6 pb-20">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-card bg-ink px-6 py-16 text-center text-paper">
            <h2 className="font-display text-4xl font-extrabold sm:text-5xl">
              Your first bug is waiting.
            </h2>
            <p className="max-w-md text-lg text-surface">
              Sign up in seconds and finish your first lesson in five minutes.
            </p>
            <Link href="/login" className={invertedButton}>
              Start learning free{' '}
              <ArrowRight className="size-4" strokeWidth={3} />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-text-secondary sm:flex-row">
          <span className="font-display font-bold text-ink">
            loop<span className="text-orange">hole</span>
          </span>
          <span>Learn to code, one bug at a time.</span>
        </div>
      </footer>
    </MotionConfig>
  );
}
