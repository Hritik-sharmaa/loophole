'use client';

import { RotateCcw } from 'lucide-react';
import { primaryButton } from '@/components/ui/buttons';

// Reloads the page the learner was trying to open.
export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className={primaryButton}
    >
      <RotateCcw className="size-4" strokeWidth={3} aria-hidden /> Try again
    </button>
  );
}
