'use client';

import {
  BookOpen,
  Check,
  Code2,
  Lightbulb,
  MessageCircleQuestion,
  Play,
  Volume2,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { GuideSays } from '@/components/guide';
import {
  CoinSticker,
  FlameSticker,
  TrophySticker,
} from '@/components/stickers';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { SectionHead } from './section-head';

// "How a lesson works" (ADR-048, ADR-049). Four step cards on the left, a
// phone on the right showing that step of a real lesson. The active card
// lifts onto white and fills a progress bar while its step lasts; around
// the phone, two notes point out what you can do on that screen (read
// aloud, explain it differently, ask for a hint...), all real features.
// On wide screens the section is pinned and scrolling plays the steps; on
// phones they play by themselves. Every card is a button that jumps to
// its step, also with reduced motion.

const STEPS: {
  title: string;
  text: string;
  icon: ReactNode;
  tile: string;
}[] = [
  {
    title: 'Read a card',
    text: 'One idea at a time, explained by your guide, with code you can run.',
    icon: <BookOpen className="size-5" strokeWidth={2.25} />,
    tile: 'bg-tile-sky',
  },
  {
    title: 'Check yourself',
    text: '"What does this print?" A quick question before you write anything.',
    icon: <MessageCircleQuestion className="size-5" strokeWidth={2.25} />,
    tile: 'bg-tile-pink',
  },
  {
    title: 'Write the code',
    text: 'Real Python, run in a sandbox and checked by tests, including hidden ones.',
    icon: <Code2 className="size-5" strokeWidth={2.25} />,
    tile: 'bg-tile-mint',
  },
  {
    title: 'Earn it',
    text: 'XP, your streak, and the next book on the map opens.',
    icon: <TrophySticker className="size-6" />,
    tile: 'bg-sun',
  },
];

// The two notes beside the phone for each step: one top right, one
// bottom left.
const NOTES: [ReactNode, ReactNode][] = [
  [
    <>
      <Play className="size-4 fill-current text-violet" /> Run it yourself
    </>,
    <>
      <Volume2 className="size-4 text-violet" /> Read aloud
    </>,
  ],
  [
    <>
      <span className="grid size-5 place-items-center rounded-full bg-violet text-paper">
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      Correct!
    </>,
    <>
      <MessageCircleQuestion className="size-4 text-violet" /> Explain it
      differently
    </>,
  ],
  [
    <>
      <span className="grid size-5 place-items-center rounded-full bg-violet text-paper">
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      3 of 3 tests passed
    </>,
    <>
      <Lightbulb className="size-4 text-violet" /> Stuck? Ask for a hint
    </>,
  ],
  [
    <>
      <CoinSticker className="size-6" /> +15 XP
    </>,
    <>
      <FlameSticker className="size-5" /> 13-day streak
    </>,
  ],
];

const DIM = 0.45;

export function LessonSteps() {
  const root = useRef<HTMLElement>(null);
  // Jumps to a step; each matchMedia branch below sets its own version.
  const goTo = useRef<(i: number) => void>(() => {});

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const screens = q('[data-screen]');
      const cards = q('[data-step-card]');
      const bodies = q('[data-step-body]');
      const bars = q('[data-step-bar]');
      const notes = (i: number) => q(`[data-note="${i}"]`);
      const last = screens.length - 1;

      // Step i, shown at once: for the start of a timeline, and for
      // reduced motion.
      const show = (i: number, t: gsap.core.Timeline | typeof gsap) => {
        t.set(screens, { autoAlpha: 0, yPercent: 0 });
        t.set(screens[i], { autoAlpha: 1 });
        t.set(cards, { autoAlpha: 0, scale: 0.97 });
        t.set(cards[i], { autoAlpha: 1, scale: 1 });
        t.set(bodies, { opacity: DIM });
        t.set(bodies[i], { opacity: 1 });
        t.set(bars, { scaleX: 0 });
        t.set(q('[data-note]'), { autoAlpha: 0, scale: 0.6 });
        t.set(notes(i), { autoAlpha: 1, scale: 1 });
      };

      const build = (tl: gsap.core.Timeline, hold: number) => {
        show(0, tl);
        for (let i = 0; i <= last; i++) {
          tl.addLabel(`step${i}`).to(bars[i], {
            scaleX: 1,
            duration: hold,
            ease: 'none',
          });
          if (i === last) break;
          tl.to(notes(i), {
            autoAlpha: 0,
            scale: 0.6,
            duration: 0.25,
            ease: 'power2.in',
          })
            .to(screens[i], { autoAlpha: 0, yPercent: -6, duration: 0.45 }, '<')
            .fromTo(
              screens[i + 1],
              { autoAlpha: 0, yPercent: 6 },
              { autoAlpha: 1, yPercent: 0, duration: 0.45 },
              '<0.1',
            )
            .to(cards[i], { autoAlpha: 0, scale: 0.97, duration: 0.35 }, '<')
            .to(cards[i + 1], { autoAlpha: 1, scale: 1, duration: 0.35 }, '<')
            .to(bodies[i], { opacity: DIM, duration: 0.35 }, '<')
            .to(bodies[i + 1], { opacity: 1, duration: 0.35 }, '<')
            .to(
              notes(i + 1),
              {
                autoAlpha: 1,
                scale: 1,
                duration: 0.45,
                ease: 'back.out(2.5)',
                stagger: 0.12,
              },
              '-=0.1',
            );
        }
        return tl;
      };

      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and (min-width: 1024px)`, () => {
        const tl = build(
          gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: '[data-pin]',
              // Pinned with the section centred in the window, so there is
              // no empty band above it while it holds.
              start: 'center center',
              end: '+=2400',
              pin: true,
              scrub: 0.6,
            },
          }),
          1,
        );
        goTo.current = (i) => {
          const st = tl.scrollTrigger;
          if (st)
            window.scrollTo({
              top: st.labelToScroll(`step${i}`) + 4,
              behavior: 'smooth',
            });
        };
      });
      mm.add(`${MOTION_OK} and (max-width: 1023px)`, () => {
        const tl = build(
          gsap.timeline({
            repeat: -1,
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: '[data-pin]',
              start: 'top 70%',
              toggleActions: 'play pause resume pause',
            },
          }),
          2.6,
        );
        goTo.current = (i) => {
          tl.play(`step${i}`);
        };
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        show(0, gsap);
        goTo.current = (i) => show(i, gsap);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="lesson" className="relative">
      <div
        data-pin
        className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-20 pb-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-20 lg:py-20"
      >
        <div className="flex flex-col gap-8">
          <SectionHead
            label="How a lesson works"
            title={
              <>
                Four small steps.
                <br />
                About five minutes.
              </>
            }
          />
          <ol className="-mx-3 flex flex-col gap-1.5 sm:mx-0">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => goTo.current(i)}
                  className="group relative flex w-full gap-4 rounded-3xl px-4 pt-4 pb-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet sm:px-5"
                >
                  {/* The active step's card, with its progress bar. */}
                  <span
                    aria-hidden
                    data-step-card
                    className={`absolute inset-0 rounded-3xl border border-border-muted bg-paper shadow-sticker-sm ${i === 0 ? '' : 'invisible'}`}
                  >
                    <span className="absolute inset-x-5 bottom-2.5 h-1 overflow-hidden rounded-full bg-surface">
                      <span
                        data-step-bar
                        className="block h-full origin-left scale-x-0 rounded-full bg-violet"
                      />
                    </span>
                  </span>
                  <span
                    data-step-body
                    className="relative flex flex-1 gap-4 transition-opacity group-hover:opacity-100!"
                  >
                    <span
                      aria-hidden
                      className={`grid size-11 shrink-0 place-items-center rounded-[30%] text-ink ${s.tile}`}
                    >
                      {s.icon}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-xs font-semibold text-text-tertiary">
                          {i + 1}/4
                        </span>
                        <span className="font-display text-xl font-semibold">
                          {s.title}
                        </span>
                      </span>
                      <span className="max-w-[40ch] text-text-secondary">
                        {s.text}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <Stage>
          <Screen first step={1}>
            <GuideSays guide="priya">
              <p className="font-display text-base font-semibold">
                Variables hold values
              </p>
              <p className="text-sm text-text-secondary">
                A name on the left, a value on the right.
              </p>
            </GuideSays>
            <Code>
              <K>city</K> = <S>&quot;Mumbai&quot;</S>
              <br />
              <K>print</K>(city)
            </Code>
            <div className="flex items-center justify-between rounded-2xl bg-paper px-3 py-2 font-mono text-xs">
              Mumbai
              <span className="rounded-full border border-border-muted px-2.5 py-0.5 font-sans font-bold">
                Run ▸
              </span>
            </div>
            <Button>Continue</Button>
          </Screen>

          <Screen step={2}>
            <p className="text-xs font-bold tracking-wider text-violet uppercase">
              Quick check
            </p>
            <p className="font-display text-lg font-semibold">
              What does this print?
            </p>
            <Code>
              <K>x</K> = 4
              <br />
              <K>if</K> x &gt; 3: <K>print</K>(<S>&quot;big&quot;</S>)
              <br />
              <K>else</K>: <K>print</K>(<S>&quot;small&quot;</S>)
            </Code>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              <span className="rounded-2xl bg-violet py-2.5 text-center font-semibold text-paper">
                big ✓
              </span>
              {['small', '4', 'Error'].map((o) => (
                <span
                  key={o}
                  className="rounded-2xl border border-border-muted bg-paper py-2.5 text-center"
                >
                  {o}
                </span>
              ))}
            </div>
            <div className="rounded-2xl bg-sun-tint px-3 py-2 text-sm font-bold">
              Shabaash! 4 is more than 3.
            </div>
            <Button>Continue</Button>
          </Screen>

          <Screen step={3}>
            <p className="text-sm text-text-secondary">
              <b className="text-ink">Your task:</b> greet the learner by name.
            </p>
            <Code>
              <K>name</K> = <K>input</K>()
              <br />
              <K>print</K>(<S>&quot;Hello, &quot;</S> + name)
            </Code>
            <ul className="flex flex-col gap-1.5 text-sm font-semibold">
              {['Asha → Hello, Asha', 'Ravi → Hello, Ravi', 'Hidden test'].map(
                (t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 rounded-xl bg-violet-tint px-2.5 py-1.5"
                  >
                    <span className="grid size-5 place-items-center rounded-full bg-violet text-[10px] text-paper">
                      ✓
                    </span>
                    {t}
                  </li>
                ),
              )}
            </ul>
            <Button>Submit</Button>
          </Screen>

          <Screen step={4}>
            <div className="relative mx-auto mt-2 grid size-32 place-items-center rounded-full bg-sun-tint">
              <TrophySticker className="size-20 animate-bob" />
            </div>
            <p className="text-center font-display text-2xl font-semibold">
              Lesson complete!
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Stat
                icon={<CoinSticker className="size-6" />}
                value="+15"
                label="XP"
              />
              <Stat
                icon={<FlameSticker className="size-6" />}
                value="13"
                label="Streak"
              />
              <Stat
                icon={
                  <span className="grid size-6 place-items-center rounded-full bg-violet text-xs text-paper">
                    ✓
                  </span>
                }
                value="100%"
                label="Right"
              />
            </div>
            <Button>Continue</Button>
          </Screen>
        </Stage>
      </div>
    </section>
  );
}

// The phone on a soft dotted panel, with each step's two notes around it.
function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative mx-auto grid h-[580px] w-full max-w-[440px] place-items-center rounded-[2.5rem] bg-violet-tint lg:w-[440px]"
    >
      <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(#cdbff7_1.2px,transparent_1.3px)] [background-size:18px_18px]" />
      <div className="relative h-[520px] w-[280px] rounded-[2.75rem] bg-paper p-2.5 shadow-[0_40px_70px_-40px_rgb(30_15_70/0.8)]">
        <div className="relative h-full overflow-hidden rounded-[2.25rem] bg-canvas">
          <div className="mx-auto mt-2.5 h-6 w-24 rounded-full bg-ink" />
          {children}
        </div>
      </div>
      {NOTES.map(([top, bottom], i) => (
        <div key={i} className="contents">
          <Note step={i} className="top-28 -right-2 rotate-2 sm:-right-8">
            {top}
          </Note>
          <Note step={i} className="bottom-24 -left-2 -rotate-2 sm:-left-8">
            {bottom}
          </Note>
        </div>
      ))}
    </div>
  );
}

function Note({
  step,
  className,
  children,
}: {
  step: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      data-note={step}
      className={`absolute z-10 flex items-center gap-2 rounded-full border border-border-muted bg-paper py-2 pr-4 pl-3 text-sm font-bold whitespace-nowrap shadow-sticker ${className} ${step === 0 ? '' : 'invisible'}`}
    >
      {children}
    </span>
  );
}

// One screen of the lesson, under the lesson's own top bar: a close
// cross and the progress through the four steps.
function Screen({
  children,
  step,
  first = false,
}: {
  children: ReactNode;
  step: number;
  first?: boolean;
}) {
  return (
    <div
      data-screen
      className={`absolute inset-x-0 top-11 bottom-0 flex flex-col gap-3 px-4 pb-5 ${first ? '' : 'invisible'}`}
    >
      <div className="flex items-center gap-2.5 pb-1">
        <span className="text-sm leading-none font-bold text-text-tertiary">
          ✕
        </span>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
          <span
            className="block h-full rounded-full bg-violet"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </span>
        <span className="font-mono text-[10px] font-semibold text-text-secondary">
          {step}/4
        </span>
      </div>
      {children}
    </div>
  );
}

function Button({ children }: { children: ReactNode }) {
  return (
    <span className="mt-auto rounded-full bg-sun py-2.5 text-center text-sm font-bold">
      {children}
    </span>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-3 font-mono text-xs leading-6 text-canvas">
      {children}
    </div>
  );
}

const K = ({ children }: { children: ReactNode }) => (
  <span className="text-sun">{children}</span>
);
const S = ({ children }: { children: ReactNode }) => (
  <span className="text-tile-mint">{children}</span>
);

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-paper py-2">
      {icon}
      <span className="font-display text-sm font-semibold">{value}</span>
      <span className="text-[10px] font-bold text-text-secondary uppercase">
        {label}
      </span>
    </div>
  );
}
