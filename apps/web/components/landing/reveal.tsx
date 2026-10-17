'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Fades and lifts its children in the first time they scroll into view.
// MotionConfig reducedMotion="user" (in LandingPage) skips the movement.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
