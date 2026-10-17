'use client';

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import { Swords, Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// A looping duel replay: two players race to fix the same bug, the server
// declares one winner. Each frame is one step of the race.
const TOTAL_TESTS = 5;
const FRAMES = [
  { you: 0, rival: 0, clock: 300 },
  { you: 1, rival: 0, clock: 262 },
  { you: 1, rival: 2, clock: 231 },
  { you: 3, rival: 2, clock: 198 },
  { you: 3, rival: 4, clock: 170 },
  { you: 5, rival: 4, clock: 143 },
];
const FRAME_MS = 900;
const WIN_HOLD_MS = 2800;
const LAST = FRAMES.length - 1;

export function DuelPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reduceMotion || !inView) return;
    const timer = setTimeout(
      () => setFrame((f) => (f === LAST ? 0 : f + 1)),
      frame === LAST ? WIN_HOLD_MS : FRAME_MS,
    );
    return () => clearTimeout(timer);
  }, [frame, inView, reduceMotion]);

  const shown = FRAMES[reduceMotion ? LAST : frame];
  const won = shown.you === TOTAL_TESTS;

  return (
    <div
      ref={ref}
      className="w-full max-w-md overflow-hidden rounded-card border-2 border-ink bg-paper shadow-press-ink"
      aria-hidden="true"
    >
      {/* DuelHeader: Ink band, white text, Orange countdown */}
      <div className="flex items-center justify-between bg-ink px-5 py-3 text-paper">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Swords className="size-5 text-orange" strokeWidth={2.5} /> Live duel
        </span>
        <span className="flex items-center gap-1.5 font-mono text-lg font-bold text-orange">
          <Timer className="size-4" strokeWidth={2.5} />
          {formatClock(shown.clock)}
        </span>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <PlayerBar name="you" passed={shown.you} highlight />
        <PlayerBar name="rival_42" passed={shown.rival} />

        <div className="relative h-12">
          <AnimatePresence mode="wait">
            {won ? (
              <motion.div
                key="win"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute inset-0 flex items-center justify-center gap-2 rounded-card bg-orange font-display text-xl font-extrabold text-ink"
              >
                You win! <span className="text-base">+16 rating</span>
              </motion.div>
            ) : (
              <motion.p
                key="racing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-text-secondary"
              >
                First to pass every test wins.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PlayerBar({
  name,
  passed,
  highlight = false,
}: {
  name: string;
  passed: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className={highlight ? 'text-ink' : 'text-text-secondary'}>
          {name}
        </span>
        <span className="font-mono">
          {passed}/{TOTAL_TESTS} passing
        </span>
      </div>
      {/* ProgressBar: Surface track, Orange fill, ease-out width */}
      <div className="h-4 overflow-hidden rounded-full bg-surface">
        <motion.div
          className="h-full rounded-full bg-orange"
          initial={false}
          animate={{ width: `${(passed / TOTAL_TESTS) * 100}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
