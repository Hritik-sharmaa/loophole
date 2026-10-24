'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { Avatar } from '@/components/avatar';
import { Guide } from '@/components/guide';
import { LanguageLogo } from '@/components/language-logo';
import { BugSticker, CoinSticker, FlameSticker } from '@/components/stickers';
import { primaryButton } from '@/components/ui/buttons';
import { ArrowBadge } from './auth-cta';
import { gsap, MOTION_OK, useGSAP } from './gsap';

// The landing hero (ADR-048): the headline is the code. It opens in an
// editor with two typos ("Lern", "freinds"), red squiggles and a status
// bar saying 2 problems. Priya's and Arjun's cursors glide in like
// collaborators in a shared file and fix them, a bug scurries off, every
// line gets a tick, the tests pass and +15 XP pops. The page debugs
// itself, which is what Loophole teaches. The markup is the fixed text,
// so without motion (or JavaScript) the headline simply reads right.
// Every reveal uses fromTo/set with explicit end values: React runs
// effects twice in development, and from() would then record "hidden"
// as the place to animate to.

const RIVAL = 's5.grin.fluffy.black.hoodie.sun.round.none.none.sun';

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const play = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const sheet = root.current!.querySelector<HTMLElement>('[data-sheet]')!;
      const q = gsap.utils.selector(root);
      // Where an element sits inside the sheet, for the cursors to fly to.
      // `edge` picks the element's left or right side to measure from.
      type Edge = 'left' | 'right';
      const at = (sel: string, dx: number, dy: number, edge: Edge) => {
        const t = q(sel)[0]?.getBoundingClientRect();
        const s = sheet.getBoundingClientRect();
        return t
          ? { x: t[edge] - s.left + dx, y: t.top - s.top + dy }
          : { x: 0, y: 0 };
      };
      const xy = (sel: string, dx = 0, dy = 0, edge: Edge = 'left') => ({
        x: () => at(sel, dx, dy, edge).x,
        y: () => at(sel, dx, dy, edge).y,
      });
      // The cursors' resting places once the bugs are fixed: just past the
      // right end of each button, so they never cover its label.
      // On narrow sheets her label would run off the edge, so she rests
      // under the button's left side instead.
      const priyaRest = () =>
        sheet.offsetWidth < 640
          ? xy('[data-cta]', 28, 40)
          : xy('[data-cta]', -34, 36, 'right');
      const arjunRest = () => xy('[data-duel-link]', 10, -4, 'right');
      const rest = () => {
        gsap.set('[data-cursor="priya"]', priyaRest());
        gsap.set('[data-cursor="arjun"]', arjunRest());
      };

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        play.current = tl;

        // The broken file.
        tl.set('[data-headline]', { autoAlpha: 1 })
          .set('[data-cursor]', { autoAlpha: 1 })
          .set('[data-ins]', { width: 0 })
          .set('[data-swap-new]', { yPercent: 100, autoAlpha: 0 })
          .set('[data-swap-old]', { yPercent: 0, autoAlpha: 1 })
          .set('[data-squiggle]', { drawSVG: '0%', autoAlpha: 1 })
          .set('[data-underline]', { drawSVG: '0%' })
          .set('[data-tick]', { scale: 0, autoAlpha: 0 })
          .set('[data-num]', { autoAlpha: 1 })
          .set('[data-status-ok]', { autoAlpha: 0, y: 10 })
          .set('[data-status-bad]', { autoAlpha: 1, y: 0 })
          .set('[data-status]', {
            backgroundColor: '#ff7a93',
            color: '#1e1638',
          })
          .set('[data-toast]', { autoAlpha: 0, y: 16, scale: 0.9 })
          .set('[data-bug]', { autoAlpha: 1, x: 0, y: 0, rotate: 0, scale: 0 })
          .set('[data-confetti]', { autoAlpha: 0, x: 0, y: 0 })
          .set('[data-cursor="priya"]', {
            x: () => sheet.offsetWidth + 40,
            y: 40,
          })
          .set('[data-cursor="arjun"]', {
            x: () => sheet.offsetWidth + 40,
            y: () => sheet.offsetHeight,
          })
          .set('[data-tag-hint]', { autoAlpha: 0, width: 0 })
          .set('[data-ptest-ok]', { autoAlpha: 0, scale: 0 })
          .set('[data-ptest-bad]', { autoAlpha: 1, scale: 1 })
          .set('[data-pxp]', { autoAlpha: 0, y: 10 })

          // 1. The lines arrive, then the problems show.
          .fromTo(
            '[data-line]',
            { y: 34, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.09 },
          )
          .fromTo(
            '[data-rest]',
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06 },
            '-=0.4',
          )
          .to(
            '[data-squiggle]',
            { drawSVG: '100%', duration: 0.5, stagger: 0.15 },
            '-=0.2',
          )
          .to(
            '[data-bug]',
            { scale: 1, duration: 0.4, ease: 'back.out(3)' },
            '<',
          )

          // 2. Priya flies in and types the missing "a".
          .to(
            '[data-cursor="priya"]',
            { ...xy('[data-ins]', 0, 18), duration: 1, ease: 'power2.inOut' },
            '+=0.3',
          )
          .to('[data-cursor="priya"]', {
            scale: 0.85,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
          })
          .to('[data-ins]', {
            width: () => q('[data-ins-char]')[0]?.offsetWidth ?? 0,
            duration: 0.16,
            ease: 'steps(1)',
          })
          .to(
            '[data-squiggle="1"]',
            { drawSVG: '100% 100%', duration: 0.35 },
            '+=0.1',
          )
          .set('[data-squiggle="1"]', { autoAlpha: 0 })
          .to('[data-num="1"]', { autoAlpha: 0, duration: 0.15 }, '<')
          .to(
            '[data-tick="1"]',
            { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(3)' },
            '<0.1',
          )
          .to(
            '[data-ptest-bad="1"]',
            { autoAlpha: 0, scale: 0, duration: 0.2 },
            '<',
          )
          .to(
            '[data-ptest-ok="1"]',
            { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' },
            '<0.1',
          )

          // 3. Arjun swaps "ei" for "ie"; the bug runs for it.
          .to(
            '[data-cursor="arjun"]',
            { ...xy('[data-swap]', 4, 22), duration: 1, ease: 'power2.inOut' },
            '-=0.5',
          )
          .to('[data-cursor="arjun"]', {
            scale: 0.85,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
          })
          .to('[data-swap-old]', {
            yPercent: -100,
            autoAlpha: 0,
            duration: 0.3,
            ease: 'power2.in',
          })
          .to(
            '[data-swap-new]',
            { yPercent: 0, autoAlpha: 1, duration: 0.35 },
            '<0.1',
          )
          .to(
            '[data-bug]',
            {
              motionPath: {
                path: [
                  { x: 30, y: -20 },
                  { x: 90, y: 10 },
                  { x: 200, y: -40 },
                ],
                curviness: 1.5,
                autoRotate: 90,
              },
              autoAlpha: 0,
              duration: 0.9,
              ease: 'power1.in',
            },
            '<',
          )
          .to(
            '[data-squiggle="2"]',
            { drawSVG: '100% 100%', duration: 0.35 },
            '<0.1',
          )
          .set('[data-squiggle="2"]', { autoAlpha: 0 }, '>')
          .to(
            '[data-num="2"], [data-num="3"]',
            { autoAlpha: 0, duration: 0.15 },
            '<',
          )
          .to(
            '[data-tick="2"], [data-tick="3"]',
            {
              scale: 1,
              autoAlpha: 1,
              duration: 0.4,
              ease: 'back.out(3)',
              stagger: 0.12,
            },
            '<0.1',
          )
          .to(
            '[data-ptest-bad="2"]',
            { autoAlpha: 0, scale: 0, duration: 0.2 },
            '<',
          )
          .to(
            '[data-ptest-ok="2"]',
            { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' },
            '<0.1',
          )
          .to(
            '[data-prun]',
            { scale: 0.88, duration: 0.1, yoyo: true, repeat: 1 },
            '+=0.1',
          )
          .to(
            '[data-ptest-bad="3"]',
            { autoAlpha: 0, scale: 0, duration: 0.2 },
            '>',
          )
          .to(
            '[data-ptest-ok="3"]',
            { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' },
            '<0.1',
          )

          // 4. Tests pass: the status bar flips, the underline draws, XP.
          .to(
            '[data-status]',
            { backgroundColor: '#6a4df4', color: '#ffffff', duration: 0.4 },
            '+=0.15',
          )
          .to(
            '[data-status-bad]',
            { autoAlpha: 0, y: -10, duration: 0.25 },
            '<',
          )
          .to('[data-status-ok]', { autoAlpha: 1, y: 0, duration: 0.3 }, '<0.1')
          .to(
            '[data-underline]',
            { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut' },
            '<',
          )
          .to(
            '[data-toast]',
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.5,
              ease: 'back.out(2)',
            },
            '<0.2',
          )
          .to(
            '[data-confetti]',
            {
              autoAlpha: 1,
              x: () => gsap.utils.random(-90, 60),
              y: () => gsap.utils.random(-80, -20),
              rotate: () => gsap.utils.random(-180, 180),
              duration: 0.8,
            },
            '<0.1',
          )
          .to('[data-confetti]', { autoAlpha: 0, duration: 0.3 }, '-=0.2')
          .to(
            '[data-pxp]',
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.1,
              ease: 'back.out(2)',
            },
            '-=0.6',
          )

          // 5. The guides settle by the buttons and say what to do.
          .to(
            '[data-cursor="priya"]',
            {
              ...priyaRest(),
              duration: 1.1,
              ease: 'power2.inOut',
            },
            '-=0.6',
          )
          .to(
            '[data-cursor="arjun"]',
            {
              ...arjunRest(),
              duration: 1.1,
              ease: 'power2.inOut',
            },
            '<0.15',
          )
          .to(
            '[data-tag-hint]',
            { autoAlpha: 1, width: 'auto', duration: 0.4 },
            '-=0.2',
          );

        // Afterwards they hover, like people reading along.
        const idle = gsap.to('[data-cursor-idle]', {
          x: () => gsap.utils.random(-6, 6),
          y: () => gsap.utils.random(-5, 5),
          duration: 1.6,
          ease: 'sine.inOut',
          repeat: -1,
          repeatRefresh: true,
          yoyo: true,
          paused: true,
        });
        tl.call(() => {
          idle.play();
        });

        // Keep the resting cursors in place when the window changes size.
        const onResize = () => {
          if (tl.progress() === 1) rest();
          tl.invalidate();
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      });

      // Less motion: the fixed file, still, with the guides at the buttons.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-tick], [data-cursor]', { autoAlpha: 1 });
        gsap.set('[data-num]', { autoAlpha: 0 });
        rest();
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 lg:pt-12 lg:pb-24"
    >
      {/* A soft glow behind the sheet. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-24 -z-10 h-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(106_77_244/0.22),transparent)] blur-2xl"
      />
      <div
        data-sheet
        className="relative overflow-hidden rounded-[2rem] border border-border-muted bg-paper shadow-[0_40px_80px_-50px_rgb(60_30_120/0.6)]"
      >
        {/* Tabs, like an editor with two people in the file. */}
        <div className="flex items-center gap-2 border-b border-border-muted bg-canvas/60 px-4 py-2.5 sm:px-5">
          <span className="size-2.5 rounded-full bg-[#ff7a93]" />
          <span className="size-2.5 rounded-full bg-sun" />
          <span className="size-2.5 rounded-full bg-tile-mint" />
          <span className="ml-3 flex items-center gap-2 rounded-lg border border-border-muted bg-paper px-2.5 py-1 font-mono text-xs font-semibold">
            <LanguageLogo language="python" className="size-3.5" />
            loophole.py
          </span>
          <span className="hidden items-center gap-2 px-2.5 py-1 font-mono text-xs text-text-tertiary sm:flex">
            <LanguageLogo language="javascript" className="size-3.5" />
            duel.js
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden>
              <Guide guide="priya" crop="bust" className="size-7" />
              <Avatar code={RIVAL} className="size-7 border-2 border-paper" />
            </div>
            <button
              type="button"
              // Restarting the existing timeline makes no new tweens, so this
              // needs no GSAP context.
              onClick={() => play.current?.restart()}
              className="flex items-center gap-1.5 rounded-full border border-border-muted bg-paper px-2.5 py-1 text-xs font-bold text-text-secondary transition-colors hover:border-violet hover:text-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            >
              <RotateCcw className="size-3.5" strokeWidth={2.5} aria-hidden />
              Replay
            </button>
          </div>
        </div>

        <div className="relative px-3 pt-8 pb-10 sm:px-6 sm:pt-12 sm:pb-14 lg:px-10">
          <h1
            data-headline
            data-gsap-hide
            className="flex flex-col font-display text-[2.35rem] leading-[1.08] font-semibold tracking-[-0.04em] sm:text-6xl lg:text-[5.4rem]"
          >
            <Row n={1}>
              <span className="relative inline-block">
                Le
                <span
                  data-ins
                  className="inline-block overflow-hidden align-bottom"
                >
                  <span data-ins-char className="inline-block">
                    a
                  </span>
                </span>
                rn
                <Squiggle id="1" />
              </span>{' '}
              to code.
            </Row>
            <Row n={2}>
              Then{' '}
              <span className="relative inline-block whitespace-nowrap text-violet">
                out‑code
                <svg
                  aria-hidden
                  viewBox="0 0 300 24"
                  preserveAspectRatio="none"
                  className="absolute -bottom-3 left-0 h-4 w-full overflow-visible sm:-bottom-4 sm:h-6"
                >
                  <path
                    data-underline
                    d="M4 16 C 60 6, 120 4, 180 10 S 270 18, 296 8"
                    fill="none"
                    className="stroke-sun"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </Row>
            <Row n={3}>
              your{' '}
              <span className="relative inline-block">
                fr
                <span
                  data-swap
                  className="relative -my-[0.1em] inline-block overflow-hidden py-[0.1em] align-bottom"
                >
                  <span data-swap-new className="inline-block">
                    ie
                  </span>
                  <span
                    data-swap-old
                    aria-hidden
                    className="invisible absolute inset-x-0 top-[0.1em] inline-block"
                  >
                    ei
                  </span>
                </span>
                nds
                <Squiggle id="2" />
                <span
                  data-bug
                  aria-hidden
                  className="invisible absolute -top-3 -right-8 sm:-right-12"
                >
                  <BugSticker className="size-7 sm:size-10" />
                </span>
              </span>
              .
            </Row>
          </h1>

          <div className="mt-8 flex flex-col gap-2 font-mono text-sm text-text-secondary sm:mt-10 sm:text-base">
            <Row n={4} small>
              <span data-rest className="block">
                <span className="text-violet"># </span>Bite-sized lessons with
                real code, graded in a real sandbox.
              </span>
            </Row>
            <Row n={5} small>
              <span data-rest className="block">
                <span className="text-violet"># </span>Then race a friend to fix
                the same bug. In English or Hinglish.
              </span>
            </Row>
          </div>

          <div
            data-rest
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-12 pl-9 sm:gap-y-5 sm:pl-14 lg:pl-16"
          >
            <Link
              data-cta
              href="/login"
              className={`${primaryButton} pr-5 text-base`}
            >
              Start your first lesson <ArrowBadge />
            </Link>
            <a
              data-duel-link
              href="#duel"
              className="rounded-badge text-sm font-bold underline decoration-violet decoration-2 underline-offset-4 hover:text-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            >
              Watch a duel
            </a>
          </div>

          {/* The tests panel, like an editor's side panel (wide screens). */}
          <aside
            aria-label="Tests"
            className="absolute top-12 right-10 hidden w-72 flex-col gap-3 rounded-3xl border border-border-muted bg-canvas p-4 lg:flex"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold">Tests</p>
              <span
                data-prun
                className="rounded-full bg-sun px-3 py-1 text-xs font-bold"
              >
                ▶ Run
              </span>
            </div>
            <ul className="flex flex-col gap-1.5 font-mono text-xs">
              {['spelling(line=1)', 'spelling(line=3)', 'prints_tagline()'].map(
                (t, i) => (
                  <li
                    key={t}
                    className="flex items-center gap-2.5 rounded-xl bg-paper px-2.5 py-2"
                  >
                    <span className="relative grid size-5 shrink-0 place-items-center">
                      <span
                        data-ptest-ok={i + 1}
                        className="absolute inset-0 grid place-items-center rounded-full bg-violet text-[10px] text-paper"
                      >
                        ✓
                      </span>
                      <span
                        data-ptest-bad={i + 1}
                        aria-hidden
                        className="invisible absolute inset-0 grid place-items-center rounded-full bg-[#ffe1e6] text-[10px] text-[#c8243a]"
                      >
                        ✕
                      </span>
                    </span>
                    {t}
                  </li>
                ),
              )}
            </ul>
            <div className="flex items-center justify-between border-t border-border-muted pt-3 text-sm font-bold">
              <span data-pxp className="flex items-center gap-1.5">
                <CoinSticker className="size-6" /> +15 XP
              </span>
              <span data-pxp className="flex items-center gap-1.5">
                <FlameSticker className="size-5" /> 1 day streak
              </span>
            </div>
          </aside>

          {/* The toast when the tests pass (narrower screens). */}
          <div
            data-toast
            aria-hidden
            className="invisible absolute right-4 bottom-4 hidden items-center gap-2 rounded-2xl border border-border-muted bg-paper py-2 pr-4 pl-2 text-sm font-bold shadow-sticker sm:right-8 sm:bottom-8 sm:flex lg:hidden"
          >
            <CoinSticker className="size-7" />
            All tests passed <span className="text-violet">+15 XP</span>
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                data-confetti
                className={`absolute top-1/2 left-1/2 size-2 rounded-[2px] ${['bg-sun', 'bg-violet', 'bg-pink', 'bg-tile-mint'][i % 4]}`}
              />
            ))}
          </div>
        </div>

        {/* The status bar: coral with problems, violet once tests pass. */}
        <div
          data-status
          className="relative flex h-9 items-center justify-between overflow-hidden bg-violet px-4 font-mono text-xs font-semibold text-paper sm:px-5"
        >
          <span className="relative h-full flex-1">
            <span
              data-status-ok
              className="absolute inset-y-0 left-0 flex items-center gap-2 whitespace-nowrap"
            >
              ✓ 3 of 3 tests passed
            </span>
            <span
              data-status-bad
              aria-hidden
              className="invisible absolute inset-y-0 left-0 flex items-center gap-2 whitespace-nowrap"
            >
              ✕ 2 problems · NameError: name &apos;Lern&apos; is not defined
            </span>
          </span>
          <span className="hidden sm:inline">Python 3.12 · UTF-8 · Ln 3</span>
        </div>

        <Cursor who="priya" name="Priya" hint="Start here" color="#5aa6f0" />
        <Cursor who="arjun" name="Arjun" hint="Race me?" color="#ffc21a" />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-2 text-sm text-text-secondary">
        <span className="font-semibold">
          Made for first-time coders in India
        </span>
        <span className="flex items-center gap-3">
          {['python', 'javascript', 'html', 'git'].map((l) => (
            <LanguageLogo key={l} language={l} className="size-5" />
          ))}
          <span>4 courses · 90 lessons · free</span>
        </span>
      </div>
    </section>
  );
}

// One line of the file: its number (which turns into a tick once the
// line is right) and its text.
function Row({
  n,
  small = false,
  children,
}: {
  n: number;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="flex items-baseline gap-3 sm:gap-6">
      <span
        aria-hidden
        className={`relative w-6 shrink-0 text-right font-mono font-normal tracking-normal text-text-tertiary sm:w-8 lg:w-10 ${small ? 'text-xs sm:text-sm' : 'text-xs sm:text-base'}`}
      >
        <span data-num={n}>{n}</span>
        {!small && (
          <span
            data-tick={n}
            className="invisible absolute inset-0 grid place-items-end text-violet"
          >
            ✓
          </span>
        )}
      </span>
      <span data-line={small ? undefined : true} className="min-w-0">
        {children}
      </span>
    </span>
  );
}

function Squiggle({ id }: { id: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      className="absolute -bottom-1 left-0 h-2 w-full overflow-visible sm:h-3"
    >
      <path
        data-squiggle={id}
        d="M0 5 Q 6 0 12 5 T 24 5 T 36 5 T 48 5 T 60 5 T 72 5 T 84 5 T 100 5"
        fill="none"
        stroke="#ff4d6d"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        visibility="hidden"
      />
    </svg>
  );
}

// A collaborator's cursor with their name, like in a shared editor.
function Cursor({
  who,
  name,
  hint,
  color,
}: {
  who: string;
  name: string;
  hint: string;
  color: string;
}) {
  return (
    <div
      data-cursor={who}
      aria-hidden
      className="pointer-events-none invisible absolute top-0 left-0 z-20"
    >
      <div data-cursor-idle className="flex items-start">
        <svg viewBox="0 0 16 22" className="size-5 drop-shadow-sm sm:size-6">
          <path
            d="M1 1 L1 18 L5.5 13.5 L9 21 L12 19.8 L8.6 12.4 L15 12.4 Z"
            fill={color}
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="mt-4 -ml-1 flex items-center rounded-full rounded-tl-sm px-2.5 py-1 text-xs font-bold whitespace-nowrap text-ink shadow-sticker-sm"
          style={{ backgroundColor: color }}
        >
          {name}
          <span data-tag-hint className="inline-block overflow-hidden">
            <span className="pl-1 font-semibold">· {hint}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
