'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Counts smoothly from the previous value (or `from`) to `target` when it
// changes: XP gains (DESIGN_SYSTEM §5, "base" 300–500 ms, ease-out). With
// reduced motion it jumps straight to the new number.
export function useCountUp(
  target: number,
  { from, durationMs = 450 }: { from?: number; durationMs?: number } = {},
): number {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(from ?? target);
  const startRef = useRef(from ?? target);

  useEffect(() => {
    if (reduceMotion) return;
    const start = startRef.current;
    if (start === target) return;

    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / durationMs);
      const eased = 1 - (1 - t) ** 3; // ease-out
      setShown(Math.round(start + (target - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    startRef.current = target;
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduceMotion]);

  return reduceMotion ? target : shown;
}
