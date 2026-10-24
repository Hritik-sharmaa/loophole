'use client';

import { useRef, type ReactNode } from 'react';
import { GUIDES, Guide, type GuideId } from '@/components/guide';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { SectionHead } from './section-head';

// The crew (ADR-048): the four guides hop in, each saying the first line
// of their course, and the lines flip between English and Hinglish, which
// nobody else offers. The lines are the real first Learn cards
// (content/*/01-*), shortened.

const CREW: { id: GuideId; course: string; en: ReactNode; hi: ReactNode }[] = [
  {
    id: 'priya',
    course: 'Python',
    en: (
      <>
        <C>print()</C> is the instruction that shows something on the screen.
      </>
    ),
    hi: (
      <>
        <C>print()</C> woh instruction hai jo screen par kuch dikhata hai.
      </>
    ),
  },
  {
    id: 'arjun',
    course: 'JavaScript',
    en: (
      <>
        <C>console.log()</C> shows a value in the console. Text goes in quotes.
      </>
    ),
    hi: (
      <>
        <C>console.log()</C> console mein ek value dikhata hai. Text quotes mein
        jaata hai.
      </>
    ),
  },
  {
    id: 'meera',
    course: 'HTML & CSS',
    en: (
      <>
        Tags wrap your content: <C>&lt;h1&gt;</C> starts a heading and{' '}
        <C>&lt;/h1&gt;</C> ends it.
      </>
    ),
    hi: (
      <>
        Tags content ko gherte hain: <C>&lt;h1&gt;</C> heading shuru karta hai
        aur <C>&lt;/h1&gt;</C> khatam.
      </>
    ),
  },
  {
    id: 'harpreet',
    course: 'Git & GitHub',
    en: <>Git saves snapshots of your project, called commits.</>,
    hi: (
      <>
        Git aapke project ke snapshots save karta hai, jinhe commits kehte hain.
      </>
    ),
  },
];

const ON = '#ffffff';
const OFF = '#6a6382';

export function CrewFinale() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // fromTo with explicit ends: see map-walk.tsx.
        gsap
          .timeline({
            scrollTrigger: { trigger: '[data-crew]', start: 'top 75%' },
          })
          .fromTo(
            '[data-guide]',
            { y: 80, autoAlpha: 0, rotate: (i) => (i % 2 ? 6 : -6) },
            {
              y: 0,
              autoAlpha: 1,
              rotate: 0,
              duration: 0.8,
              ease: 'back.out(1.8)',
              stagger: 0.12,
            },
          )
          .fromTo(
            '[data-cheer-tag]',
            { scale: 0 },
            { scale: 1, duration: 0.4, ease: 'back.out(3)', stagger: 0.12 },
            '-=0.5',
          );

        // English and Hinglish take turns while the section is on screen.
        const flip = gsap.timeline({
          repeat: -1,
          defaults: { duration: 0.45, ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: '[data-crew]',
            start: 'top 70%',
            end: 'bottom top',
            toggleActions: 'play pause resume pause',
          },
        });
        flip
          .set('[data-lang-hi]', { autoAlpha: 0, y: 10 })
          .set('[data-lang-en]', { autoAlpha: 1, y: 0 })
          .set('[data-lang-pill]', { xPercent: 0 })
          .set('[data-lang-label="en"]', { color: ON })
          .set('[data-lang-label="hi"]', { color: OFF })
          .to({}, { duration: 3 })
          .to('[data-lang-en]', { autoAlpha: 0, y: -10, stagger: 0.08 })
          .to('[data-lang-hi]', { autoAlpha: 1, y: 0, stagger: 0.08 }, '<0.15')
          .to('[data-lang-pill]', { xPercent: 100 }, '<')
          .to('[data-lang-label="en"]', { color: OFF }, '<')
          .to('[data-lang-label="hi"]', { color: ON }, '<')
          .to({}, { duration: 3 })
          .to('[data-lang-hi]', { autoAlpha: 0, y: -10, stagger: 0.08 })
          .to('[data-lang-en]', { autoAlpha: 1, y: 0, stagger: 0.08 }, '<0.15')
          .to('[data-lang-pill]', { xPercent: 0 }, '<')
          .to('[data-lang-label="en"]', { color: ON }, '<')
          .to('[data-lang-label="hi"]', { color: OFF }, '<');
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="crew"
      className="mx-auto flex max-w-6xl scroll-mt-16 flex-col gap-12 px-4 py-20 sm:px-6 lg:py-28"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <SectionHead label="Your guides" title="Guides who talk like you.">
          <p className="max-w-[44ch] text-lg text-text-secondary">
            Every lesson is written twice, by hand: in English and in Hinglish.
            Pick either on your profile, any time.
          </p>
        </SectionHead>
        {/* Which language the bubbles are in right now. */}
        <div
          aria-hidden
          className="relative grid w-fit grid-cols-2 rounded-full border border-border-muted bg-paper p-1 text-sm font-bold"
        >
          <span
            data-lang-pill
            className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-violet"
          />
          <span
            data-lang-label="en"
            className="relative z-10 px-4 py-1.5 text-center text-paper"
          >
            English
          </span>
          <span
            data-lang-label="hi"
            className="relative z-10 px-4 py-1.5 text-center text-text-secondary"
          >
            Hinglish
          </span>
        </div>
      </div>

      <ul
        data-crew
        className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {CREW.map(({ id, course, en, hi }) => (
          <li
            key={id}
            data-guide
            className="flex flex-col items-center gap-4 rounded-card border border-border-muted bg-paper p-5 pt-7"
          >
            <div className="relative">
              <Guide
                guide={id}
                mood="happy"
                crop="bust"
                className="size-28 drop-shadow-[0_18px_22px_rgb(60_30_120/0.25)] sm:size-32"
              />
              <span
                data-cheer-tag
                className="absolute -top-2 -right-8 rotate-6 rounded-full bg-ink px-2.5 py-1 text-xs font-bold whitespace-nowrap text-paper"
              >
                {GUIDES[id].cheer}
              </span>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-semibold">
                {GUIDES[id].name}
              </p>
              <p className="text-sm text-text-secondary">{course}</p>
            </div>
            {/* The bubble holds both languages stacked in one cell, so it
                is as tall as the longer one and never jumps. */}
            <div className="relative grid w-full flex-1 rounded-2xl rounded-tl-sm bg-canvas px-4 py-3.5 text-sm leading-relaxed">
              <p data-lang-en lang="en" className="col-start-1 row-start-1">
                {en}
              </p>
              <p
                data-lang-hi
                lang="hi-Latn"
                className="invisible col-start-1 row-start-1"
              >
                {hi}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-violet-tint px-1 py-0.5 font-mono text-[0.85em] text-violet-deep">
      {children}
    </code>
  );
}
