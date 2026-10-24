'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { LanguageLogo } from '@/components/language-logo';
import { Logo } from '@/components/logo';
import { NavAuthButton } from './auth-cta';
import { AvatarShuffle } from './avatar-shuffle';
import { ClosingCta } from './closing-cta';
import { CrewFinale } from './crew-finale';
import { DuelRace } from './duel-race';
import { Faq } from './faq';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap';
import { Hero } from './hero';
import { LessonMarquee } from './lesson-marquee';
import { LessonSteps } from './lesson-steps';
import { MapWalk } from './map-walk';

// The public landing page at "/" (ADR-047, ADR-048). Instead of describing
// the product it shows it working, scene by scene, with GSAP: a bug fixed
// and graded in the hero, real lesson titles drifting by, one lesson
// played step by step, the course map drawn as you scroll with the four
// courses under it, a duel raced, an avatar remade, the crew, the common
// questions and a last call to start. Every scene respects reduced motion.

const NAV = [
  { href: '#lesson', label: 'How it works' },
  { href: '#courses', label: 'Courses' },
  { href: '#duel', label: 'Duels' },
  { href: '#faq', label: 'FAQ' },
];

const FOOTER: { title: string; links: [string, string][] }[] = [
  {
    title: 'Learn',
    links: [
      ['/learn', 'All courses'],
      ['/bug-of-the-day', 'Bug of the day'],
      ['/leaderboard', 'Leaderboard'],
    ],
  },
  {
    title: 'Play',
    links: [
      ['/duels', 'Duels'],
      ['#duel', 'How duels work'],
      ['/login', 'Log in'],
    ],
  },
];

const COURSES = [
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['html', 'HTML & CSS'],
  ['git', 'Git & GitHub'],
];

export function LandingPage() {
  const header = useRef<HTMLElement>(null);

  // The nav slips away while reading down and comes back on the way up.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const hide = gsap.to(header.current, {
        yPercent: -110,
        duration: 0.3,
        ease: 'power2.out',
        paused: true,
      });
      ScrollTrigger.create({
        start: 'top -120',
        end: 'max',
        onUpdate: (self) =>
          self.direction === 1 ? hide.play() : hide.reverse(),
        onLeaveBack: () => hide.reverse(),
      });
    });
  });

  return (
    <>
      <header
        ref={header}
        className="sticky top-0 z-30 border-b border-border-muted/60 bg-canvas/80 backdrop-blur-md"
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo href="/" />
          <ul className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="rounded-badge text-sm font-semibold text-text-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <NavAuthButton />
        </nav>
      </header>

      <main className="flex-1 overflow-x-clip">
        <Hero />
        <LessonMarquee />
        <LessonSteps />
        <MapWalk />
        <DuelRace />
        <AvatarShuffle />
        <CrewFinale />
        <Faq />
        <ClosingCta />
      </main>

      <footer className="border-t border-border-muted bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col items-start gap-4 md:col-span-1">
            <Logo href="/" size="sm" />
            <p className="max-w-[32ch] text-sm text-text-secondary">
              Learn to code. Then out-code your friends. Bite-sized lessons in
              English or Hinglish, and live debugging duels.
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Courses">
              {COURSES.map(([lang, name]) => (
                <li
                  key={lang}
                  className="flex items-center gap-1.5 rounded-full border border-border-muted px-2.5 py-1 text-xs font-semibold"
                >
                  <LanguageLogo language={lang} className="size-3.5" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-sm font-bold">{col.title}</p>
              <ul className="flex flex-col gap-2">
                {col.links.map(([href, label]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="rounded-badge text-sm text-text-secondary transition-colors hover:text-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border-muted">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-text-tertiary sm:px-6">
            Made in India for first-time coders.
          </p>
        </div>
      </footer>
    </>
  );
}
