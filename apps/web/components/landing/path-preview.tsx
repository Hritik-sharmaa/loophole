'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { LessonState } from '@loophole/shared';
import { useRef } from 'react';
import { pathThrough } from '@/lib/path-geometry';
import { LessonNode } from '../lesson-node';

// A small version of the lesson path (DESIGN_SYSTEM §6 LessonPath). When it
// scrolls into view, the completed part of the path draws in Ink and the
// nodes pop in one after another.

const NODES: { x: number; y: number; state: LessonState; label: string }[] = [
  { x: 150, y: 50, state: 'completed', label: 'Print' },
  { x: 230, y: 150, state: 'completed', label: 'Variables' },
  { x: 150, y: 250, state: 'completed', label: 'If / else' },
  { x: 70, y: 350, state: 'active', label: 'Loops' },
  { x: 150, y: 450, state: 'locked', label: 'Functions' },
  { x: 230, y: 550, state: 'locked', label: 'Lists' },
];

const WIDTH = 300;
const HEIGHT = 600;

const FULL_PATH = pathThrough(NODES);
const DONE_PATH = pathThrough(
  NODES.slice(0, NODES.findIndex((n) => n.state === 'active') + 1),
);

export function PathPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const show = inView || !!reduceMotion;

  return (
    <div
      ref={ref}
      className="relative mx-auto"
      style={{ width: WIDTH, height: HEIGHT }}
      aria-hidden="true"
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="absolute inset-0"
        fill="none"
      >
        <path
          d={FULL_PATH}
          className="stroke-surface"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <motion.path
          d={DONE_PATH}
          className="stroke-ink"
          strokeWidth={6}
          strokeLinecap="round"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: show ? 1 : 0 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </svg>

      {NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute flex flex-col items-center gap-1"
          style={{ left: node.x - 32, top: node.y - 32 }}
          initial={{ scale: reduceMotion ? 1 : 0 }}
          animate={{ scale: show ? 1 : 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            delay: reduceMotion ? 0 : 0.2 + i * 0.22,
          }}
        >
          <LessonNode state={node.state} />
          <span
            className={`relative z-10 rounded-badge bg-paper px-2 py-0.5 text-xs font-bold whitespace-nowrap ${node.state === 'locked' ? 'text-text-tertiary' : 'text-ink'}`}
          >
            {node.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
