'use client';

import { motion } from 'framer-motion';
import { Flame, Lightbulb, Terminal } from 'lucide-react';
import { stickerCard } from '@/components/ui/card';
import { Reveal } from './reveal';

// Each card sits at its own slight angle, like stickers on a laptop lid.
const FEATURES = [
  {
    icon: Terminal,
    tile: 'bg-blue-tint',
    tilt: '-rotate-1',
    title: 'Real code, real grading',
    body: 'Write real code in the browser. A sandbox runs it against tests in seconds and shows exactly what passed.',
  },
  {
    icon: Lightbulb,
    tile: 'bg-pink',
    tilt: 'rotate-1',
    title: 'Hints that don’t spoil it',
    body: 'Stuck? Your course guide, the AI tutor, explains your error and nudges you forward, without ever handing you the answer.',
  },
  {
    icon: Flame,
    tile: 'bg-lemon',
    tilt: '-rotate-[0.5deg]',
    title: 'Streaks and XP',
    body: 'Every finished lesson pays XP. Come back daily to grow your streak and climb the weekly leaderboard.',
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mb-12 max-w-xl">
        <h2 className="font-display text-4xl font-extrabold text-balance">
          Practice that actually sticks
        </h2>
        <p className="mt-3 text-lg text-text-secondary">
          Five minutes a day, one small program at a time.
        </p>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, tile, tilt, title, body }, i) => (
          <Reveal key={title} delay={i * 0.1}>
            <motion.article
              whileHover={{ y: -6, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className={`${stickerCard} ${tilt} flex h-full flex-col gap-3 p-6`}
            >
              <span
                className={`flex size-12 items-center justify-center rounded-card border-2 border-ink ${tile}`}
              >
                <Icon className="size-6 text-ink" strokeWidth={2.5} />
              </span>
              <h3 className="font-display text-xl font-bold">{title}</h3>
              <p className="text-text-secondary">{body}</p>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
