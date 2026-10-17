'use client';

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import { Check, Flame, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// A looping "fix the bug" story: buggy code fails 2 of 3 tests, a "+" is
// typed in, the tests re-run one by one, and the lesson pays +10 XP.
// Steps: 0 bug · 1 fix typed · 2–4 tests pass one by one · 5 complete.
const STEP_MS = [1800, 900, 450, 450, 450, 2600];
const LAST_STEP = STEP_MS.length - 1;

const TESTS = [
  { input: 'total([2, 3, 5])', expected: '10', buggy: '5' },
  { input: 'total([1, 1])', expected: '2', buggy: '1' },
  { input: 'total([])', expected: '0', buggy: '0' },
];

export function CodeDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  // Advance through the story only while the demo is on screen.
  useEffect(() => {
    if (reduceMotion || !inView) return;
    const timer = setTimeout(
      () => setStep((s) => (s === LAST_STEP ? 0 : s + 1)),
      STEP_MS[step],
    );
    return () => clearTimeout(timer);
  }, [step, inView, reduceMotion]);

  // Reduced motion: show the finished state, no loop.
  const shown = reduceMotion ? LAST_STEP : step;
  const fixed = shown >= 1;
  const done = shown === LAST_STEP;

  return (
    <div ref={ref} className="relative w-full max-w-md" aria-hidden="true">
      <div className="overflow-hidden rounded-card border-2 border-ink bg-paper shadow-press-ink">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2">
          <span className="font-mono text-sm font-bold">sum.py</span>
          <span className="rounded-badge bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary">
            Lesson 3 · Loops
          </span>
        </div>

        {/* Code */}
        <pre className="px-4 py-4 font-mono text-[13px] leading-6 sm:text-sm">
          <Line n={1}>
            <Kw>def</Kw> total(nums):
          </Line>
          <Line n={2}>{'    '}result = 0</Line>
          <Line n={3}>
            {'    '}
            <Kw>for</Kw> n <Kw>in</Kw> nums:
          </Line>
          <Line n={4} highlight={!fixed}>
            {'        '}result{' '}
            <AnimatePresence initial={false}>
              {fixed && (
                <motion.span
                  key="plus"
                  initial={{ opacity: 0, scale: 0.2, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="inline-block rounded bg-orange px-0.5 font-bold text-ink"
                >
                  +
                </motion.span>
              )}
            </AnimatePresence>
            = n
            {shown === 1 && (
              <motion.span
                className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-ink"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </Line>
          <Line n={5}>
            {'    '}
            <Kw>return</Kw> result
          </Line>
        </pre>

        {/* Test results */}
        <div className="border-t-2 border-ink bg-surface/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-text-secondary">
            <span>Tests</span>
            <span className="font-mono normal-case">
              {passedCount(shown)}/{TESTS.length} passing
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {TESTS.map((test, i) => (
              <TestRow
                key={test.input}
                test={test}
                state={rowState(shown, i)}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Rewards that pop when the lesson completes */}
      <AnimatePresence>
        {done && (
          <>
            <motion.div
              key="xp"
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: -6, scale: 1 }}
              exit={{ opacity: 0, y: -24, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="absolute -top-5 right-4 flex items-center gap-1 rounded-badge bg-orange px-3 py-1 font-display text-lg font-extrabold text-ink shadow-press-orange"
            >
              <Zap className="size-4" strokeWidth={3} /> +10 XP
            </motion.div>
            <motion.div
              key="streak"
              initial={{ opacity: 0, x: -10, scale: 0.6 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15,
                delay: 0.15,
              }}
              className="absolute -bottom-5 left-4 flex items-center gap-1 rounded-badge border-2 border-ink bg-paper px-3 py-1 text-sm font-bold"
            >
              <Flame className="size-4 text-orange" strokeWidth={3} /> 4-day
              streak
            </motion.div>
            <Sparks key="sparks" />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

type RowState = 'buggy' | 'pending' | 'pass';

// Step 0 shows the buggy results; step 1 waits; steps 2–4 pass rows one by one.
function rowState(step: number, index: number): RowState {
  if (step === 0) return 'buggy';
  return step >= index + 2 ? 'pass' : 'pending';
}

function passedCount(step: number): number {
  if (step === 0) return TESTS.filter((t) => t.buggy === t.expected).length;
  return Math.max(0, Math.min(TESTS.length, step - 1));
}

function TestRow({
  test,
  state,
}: {
  test: (typeof TESTS)[number];
  state: RowState;
}) {
  const ok =
    state === 'pass' || (state === 'buggy' && test.buggy === test.expected);
  const actual = state === 'buggy' ? test.buggy : test.expected;

  return (
    <li className="flex items-center gap-2 font-mono text-xs sm:text-[13px]">
      <span className="flex size-5 shrink-0 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'pending' ? (
            <motion.span
              key="pending"
              className="size-2 rounded-full bg-border-muted"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ) : ok ? (
            <motion.span
              key="pass"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              className="flex size-5 items-center justify-center rounded-full bg-orange text-ink"
            >
              <Check className="size-3.5" strokeWidth={3.5} />
            </motion.span>
          ) : (
            <motion.span
              key="fail"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex size-5 items-center justify-center rounded-full border-2 border-ink text-ink"
            >
              <X className="size-3" strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="truncate">{test.input}</span>
      <span className="ml-auto shrink-0 text-text-secondary">
        {state === 'pending' ? '…' : `→ ${actual}`}
      </span>
    </li>
  );
}

// Little orange bursts behind the XP badge.
function Sparks() {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className="pointer-events-none absolute -top-2 right-16">
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <motion.span
            key={deg}
            className="absolute size-2 rounded-full bg-orange-tint"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * 42,
              y: Math.sin(rad) * 42,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

function Line({
  n,
  highlight = false,
  children,
}: {
  n: number;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`-mx-4 flex px-4 transition-colors duration-300 ${highlight ? 'bg-orange-tint/40' : ''}`}
    >
      <span className="mr-4 w-4 shrink-0 select-none text-right text-text-tertiary">
        {n}
      </span>
      <span className="whitespace-pre">{children}</span>
    </div>
  );
}

function Kw({ children }: { children: ReactNode }) {
  return <span className="font-bold">{children}</span>;
}
