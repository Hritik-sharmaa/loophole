'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { CodeDemo } from './code-demo';
import { FloatingGlyphs } from './floating-glyphs';

const HEADLINE = ['Learn', 'to', 'code.', 'One', 'bug', 'at', 'a', 'time.'];
// The words drawn in Orange.
const ACCENT = new Set(['bug']);

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <FloatingGlyphs />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-12 pb-20 md:grid-cols-2 md:pt-20 md:pb-28">
        <div className="flex flex-col items-start gap-6">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-badge bg-surface px-3 py-1 text-xs font-bold tracking-wide uppercase"
          >
            Python track · free
          </motion.span>

          <h1 className="font-display text-5xl leading-[1.05] font-extrabold sm:text-6xl">
            {HEADLINE.map((word, i) => (
              <motion.span
                key={word + i}
                className={`mr-[0.25em] inline-block ${ACCENT.has(word) ? 'text-orange' : ''}`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 18,
                  delay: 0.1 + i * 0.06,
                }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="max-w-md text-lg text-text-secondary"
          >
            Bite-sized lessons where you write real code, get graded in seconds,
            and keep your streak alive. Then race a friend to fix the same bug
            in a live 1v1 duel.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="flex flex-wrap gap-3"
          >
            <Link href="/login" className={primaryButton}>
              Start learning free{' '}
              <ArrowRight className="size-4" strokeWidth={3} />
            </Link>
            <a href="#duels" className={secondaryButton}>
              See a duel
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 18,
            delay: 0.3,
          }}
          className="flex justify-center md:justify-end"
        >
          <CodeDemo />
        </motion.div>
      </div>
    </section>
  );
}
