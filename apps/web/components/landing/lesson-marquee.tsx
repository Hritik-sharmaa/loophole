'use client';

import { useRef } from 'react';
import { LanguageLogo } from '@/components/language-logo';
import { gsap, MOTION_OK, useGSAP } from './gsap';

// Two bands of real lesson titles drifting in opposite directions
// (ADR-048): the courses' actual first units, not made-up topics. Hover
// slows a band down so a title can be read.

const ROWS: { language: string; title: string }[][] = [
  [
    { language: 'python', title: 'Hello, world' },
    { language: 'javascript', title: 'FizzBuzz for one number' },
    { language: 'html', title: 'A navigation bar' },
    { language: 'git', title: 'Your first commit' },
    { language: 'python', title: 'Leap year' },
    { language: 'javascript', title: 'Project: Train journey' },
    { language: 'html', title: 'A sign-up form' },
    { language: 'git', title: 'Make a branch' },
  ],
  [
    { language: 'python', title: 'Project: Samosa party' },
    { language: 'git', title: 'Oops: unstage a file' },
    { language: 'html', title: 'Your first heading' },
    { language: 'javascript', title: 'Changing values with let' },
    { language: 'python', title: 'Letter grade' },
    { language: 'git', title: 'Merge a branch' },
    { language: 'html', title: 'Project: Event page' },
    { language: 'javascript', title: 'Count to N' },
  ],
];

export function LessonMarquee() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const off: (() => void)[] = [];
        gsap.utils.toArray<HTMLElement>('[data-band]').forEach((band, i) => {
          const loop = gsap.fromTo(
            band,
            { xPercent: i === 0 ? 0 : -50 },
            {
              xPercent: i === 0 ? -50 : 0,
              duration: 38,
              ease: 'none',
              repeat: -1,
            },
          );
          const slow = () => gsap.to(loop, { timeScale: 0.15, duration: 0.6 });
          const fast = () => gsap.to(loop, { timeScale: 1, duration: 0.6 });
          band.addEventListener('mouseenter', slow);
          band.addEventListener('mouseleave', fast);
          off.push(() => {
            band.removeEventListener('mouseenter', slow);
            band.removeEventListener('mouseleave', fast);
          });
        });
        return () => off.forEach((f) => f());
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-label="Some of the lessons"
      className="relative flex flex-col gap-3 overflow-hidden border-y border-border-muted bg-paper py-6"
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex w-max" data-band>
          {/* Twice, so the loop has no seam. */}
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 gap-3 pr-3"
            >
              {row.map((l) => (
                <li
                  key={l.title}
                  className="flex items-center gap-2.5 rounded-full border border-border-muted bg-canvas py-2 pr-5 pl-2 text-sm font-bold whitespace-nowrap"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-paper">
                    <LanguageLogo language={l.language} className="size-4" />
                  </span>
                  {l.title}
                </li>
              ))}
            </ul>
          ))}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper to-transparent" />
    </section>
  );
}
