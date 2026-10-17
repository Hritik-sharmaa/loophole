'use client';

import { motion } from 'framer-motion';
import { Flame, Lightbulb, Terminal } from 'lucide-react';
import { Reveal } from './reveal';

const FEATURES = [
  {
    icon: Terminal,
    title: 'Real code, real grading',
    body: 'Write Python in the browser. A sandbox runs it against tests in seconds and shows exactly what passed.',
  },
  {
    icon: Lightbulb,
    title: 'Hints that don’t spoil it',
    body: 'Stuck? The AI tutor explains your error and nudges you forward, without ever handing you the answer.',
  },
  {
    icon: Flame,
    title: 'Streaks and XP',
    body: 'Every finished lesson pays XP. Come back daily to grow your streak and climb the weekly leaderboard.',
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Reveal className="mb-12 max-w-xl">
        <h2 className="font-display text-4xl font-extrabold">
          Practice that actually sticks
        </h2>
        <p className="mt-3 text-lg text-text-secondary">
          Five minutes a day, one small program at a time.
        </p>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 0.1}>
            <motion.article
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="flex h-full flex-col gap-3 rounded-card border-2 border-ink bg-paper p-6 shadow-press-ink"
            >
              <span className="flex size-12 items-center justify-center rounded-card bg-surface">
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
