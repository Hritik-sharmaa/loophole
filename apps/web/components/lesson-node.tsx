import type { LessonState } from '@loophole/shared';
import { Check, Lock, Star } from 'lucide-react';

// The round lesson button from DESIGN_SYSTEM §6 (LessonNode): 64 px circle,
// Ink when done, pulsing Orange for "your move now", gray when locked.
// Purely visual; the caller wraps it in a link when it should be clickable.
export function LessonNode({ state }: { state: LessonState }) {
  if (state === 'completed') {
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
