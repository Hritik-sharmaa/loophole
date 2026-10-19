'use client';

import { useEffect } from 'react';

// Registers public/sw.js (ADR-022). Production only: in `next dev` a
// service worker would cache files that change on every save.
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {
        // Not fatal: the app works the same without it, just not offline.
      });
  }, []);

  return null;
}
