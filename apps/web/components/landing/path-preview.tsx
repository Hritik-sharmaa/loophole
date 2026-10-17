'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, Lock, Star } from 'lucide-react';
import { useRef } from 'react';

// A small version of the lesson path (DESIGN_SYSTEM §6 LessonPath). When it
// scrolls into view, the completed part of the path draws in Ink and the
// nodes pop in one after another.
type NodeState = 'done' | 'active' | 'locked';

const NODES: { x: number; y: number; state: NodeState; label: string }[] = [
  { x: 150, y: 50, state: 'done', label: 'Print' },
  { x: 230, y: 150, state: 'done', label: 'Variables' },
  { x: 150, y: 250, state: 'done', label: 'If / else' },
  { x: 70, y: 350, state: 'active', label: 'Loops' },
  { x: 150, y: 450, state: 'locked', label: 'Functions' },
  { x: 230, y: 550, state: 'locked', label: 'Lists' },
];

const WIDTH = 300;
const HEIGHT = 600;

// Smooth S-curves between consecutive nodes.
function pathThrough(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    })
    .join(' ');
}

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

function LessonNode({ state }: { state: NodeState }) {
  if (state === 'done') {
    return (
      <span className="flex size-16 items-center justify-center rounded-node border-[3px] border-black bg-ink text-paper shadow-press-ink">
        <Check className="size-7" strokeWidth={3.5} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="relative flex size-16 animate-pulse-node items-center justify-center rounded-node border-[3px] border-orange-dark bg-orange text-ink shadow-press-orange">
        <Star className="size-7" strokeWidth={3} fill="currentColor" />
        <span className="absolute top-1/2 left-full ml-3 -translate-y-1/2 rounded-badge bg-ink px-2 py-0.5 text-xs font-bold whitespace-nowrap text-paper">
          Start here
        </span>
      </span>
    );
  }
  return (
    <span className="flex size-16 items-center justify-center rounded-node border-[3px] border-border-muted bg-surface text-text-tertiary shadow-press-locked">
      <Lock className="size-6" strokeWidth={3} />
    </span>
  );
}
