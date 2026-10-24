'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { NavProgress } from '@/components/nav-progress';

// Client-side providers for the whole app. useState keeps one QueryClient
// per browser tab instead of creating a new one on every render.
// MotionConfig turns every Framer Motion animation into an instant change
// for visitors who ask for less motion (ADR-048).
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NavProgress />
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
