'use client';

import { useRef, type ReactNode } from 'react';
import { GuideSays } from '@/components/guide';
import {
  CoinSticker,
  FlameSticker,
  TrophySticker,
} from '@/components/stickers';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { SectionHead } from './section-head';

// "One lesson, start to finish" (ADR-048). On wide screens the section is
// pinned while you scroll and the phone moves through the four steps of a
// real lesson; on phones the steps play by themselves. The screens are
// drawn from the app's own parts (guide bubble, code block, test rows).

const STEPS = [
  {
    title: 'Read a card',
    text: 'One idea at a time, explained by your guide, with code you can run.',
  },
  {
    title: 'Check yourself',
    text: '"What does this print?" A quick question before you write anything.',
  },
  {
    title: 'Write the code',
    text: 'Real Python, run in a sandbox and checked by tests, including hidden ones.',
  },
  {
    title: 'Earn it',
    text: 'XP, your streak, and the next book on the map opens.',
  },
];

export function LessonSteps() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const screens = gsap.utils.toArray<HTMLElement>('[data-screen]');
      const steps = gsap.utils.toArray<HTMLElement>('[data-step]');
      const build = (tl: gsap.core.Timeline, hold: number) => {
        tl.set(screens.slice(1), { autoAlpha: 0, yPercent: 6 })
          .set(screens[0], { autoAlpha: 1, yPercent: 0 })
          .set(steps, { opacity: 0.35 })
          .set(steps[0], { opacity: 1 })
          .set('[data-step-dot]', {
            backgroundColor: '#ffffff',
            color: '#6a6382',
          })
          .set(steps[0].querySelector('[data-step-dot]'), {
            backgroundColor: '#6a4df4',
            color: '#ffffff',
          })
          .set('[data-progress]', { scaleY: 0.12 })
          .addLabel('step0');
        for (let i = 1; i < screens.length; i++) {
          tl.to({}, { duration: hold })
            .to(screens[i - 1], { autoAlpha: 0, yPercent: -6, duration: 0.5 })
            .to(
              screens[i],
              { autoAlpha: 1, yPercent: 0, duration: 0.5 },
              '<0.1',
            )
            .to(steps[i - 1], { opacity: 0.55, duration: 0.3 }, '<')
            .to(steps[i], { opacity: 1, duration: 0.3 }, '<')
            .to(
              steps[i].querySelector('[data-step-dot]'),
              { backgroundColor: '#6a4df4', color: '#ffffff', duration: 0.3 },
              '<',
            )
            .to(
              '[data-progress]',
              {
                scaleY: 0.12 + (0.88 * i) / (screens.length - 1),
                duration: 0.5,
              },
              '<',
            )
            .addLabel(`step${i}`);
        }
        tl.to({}, { duration: hold });
        return tl;
      };

      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and (min-width: 1024px)`, () => {
        build(
          gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: '[data-pin]',
              // Pinned with the section centred in the window, so there is
              // no empty band above it while it holds.
              start: 'center center',
              end: '+=2000',
              pin: true,
              scrub: 0.6,
            },
          }),
          0.6,
        );
      });
      mm.add(`${MOTION_OK} and (max-width: 1023px)`, () => {
        build(
          gsap.timeline({
            repeat: -1,
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: '[data-pin]',
              start: 'top 70%',
              toggleActions: 'play pause resume pause',
            },
          }),
          2.2,
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="lesson" className="relative">
      <div
        data-pin
        className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-20 pb-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-24 lg:py-20"
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
          <ol className="relative flex flex-col gap-6 pl-1">
            <span
              aria-hidden
              className="absolute top-4 bottom-4 left-[1.15rem] w-0.5 rounded bg-border-muted"
            />
            <span
              aria-hidden
              data-progress
              className="absolute top-4 bottom-4 left-[1.15rem] w-0.5 origin-top rounded bg-violet"
            />
            {STEPS.map((s, i) => (
              <li key={s.title} data-step className="relative flex gap-4">
                <span
                  data-step-dot
                  className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border border-border-muted bg-paper font-display text-sm font-semibold"
                >
                  {i + 1}
                </span>
                <div className="pt-1">
                  <h3 className="font-display text-xl font-semibold">
                    {s.title}
                  </h3>
                  <p className="mt-1 max-w-[38ch] text-text-secondary">
                    {s.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Phone>
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
            <span className="mt-auto rounded-full bg-sun py-2.5 text-center text-sm font-bold">
              Continue
            </span>
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
            <div className="mt-auto rounded-2xl bg-sun-tint px-3 py-2 text-sm font-bold">
              Shabaash! 4 is more than 3.
            </div>
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
            <span className="mt-auto rounded-full bg-sun py-2.5 text-center text-sm font-bold">
              Submit
            </span>
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
            <span className="mt-auto rounded-full bg-sun py-2.5 text-center text-sm font-bold">
              Continue
            </span>
          </Screen>
        </Phone>
      </div>
    </section>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className="relative mx-auto shrink-0 lg:mr-6">
      <div className="absolute -inset-x-8 inset-y-10 -z-10 rotate-6 rounded-[3rem] bg-gradient-to-br from-[#7a60ff] to-violet-deep" />
      <CoinSticker className="absolute -top-4 -right-10 z-10 size-14 animate-bob" />
      <FlameSticker className="absolute -bottom-2 -left-8 z-10 size-12 animate-bob [animation-delay:-1.4s]" />
      <div className="relative h-[520px] w-[280px] rounded-[2.75rem] bg-paper p-2.5 shadow-[0_40px_70px_-40px_rgb(30_15_70/0.8)]">
        <div className="relative h-full overflow-hidden rounded-[2.25rem] bg-canvas">
          <div className="mx-auto mt-2.5 h-6 w-24 rounded-full bg-ink" />
          {children}
        </div>
      </div>
    </div>
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
