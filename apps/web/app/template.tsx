'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Every page fades in when you move between pages (ADR-048). Opacity only:
// a transform here would turn the lesson's fixed Continue bar and the
// sticky header into children of a moving box while it plays.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
