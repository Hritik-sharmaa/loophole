'use client';

import { motion, useReducedMotion } from 'framer-motion';

// Code symbols drifting slowly behind the hero. Purely decorative.
const GLYPHS = [
  { char: '{ }', left: '6%', top: '18%', size: 'text-5xl', duration: 9 },
  { char: '( )', left: '88%', top: '12%', size: 'text-4xl', duration: 11 },
  { char: ';', left: '14%', top: '72%', size: 'text-6xl', duration: 8 },
  { char: '#', left: '92%', top: '64%', size: 'text-5xl', duration: 10 },
  { char: '</>', left: '48%', top: '6%', size: 'text-3xl', duration: 12 },
  { char: '=', left: '60%', top: '88%', size: 'text-5xl', duration: 9.5 },
  { char: '[ ]', left: '30%', top: '90%', size: 'text-4xl', duration: 10.5 },
];

export function FloatingGlyphs() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {GLYPHS.map((g, i) => (
        <motion.span
          key={g.char + i}
          className={`absolute font-mono font-bold text-border-muted select-none ${g.size}`}
          style={{ left: g.left, top: g.top }}
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -18, 0], rotate: [0, i % 2 ? 8 : -8, 0] }
          }
          transition={{
            duration: g.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {g.char}
        </motion.span>
      ))}
    </div>
  );
}
