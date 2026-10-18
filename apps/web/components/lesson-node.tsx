import type { LessonState } from '@loophole/shared';
import { Check, Lock, Star } from 'lucide-react';

// Press feel (DESIGN_SYSTEM §4): inside a `group` link, the node drops 4 px
// and its shadow collapses while pressed.
const PRESS =
  'transition-[translate,box-shadow] duration-[50ms] group-active:translate-y-1 group-active:shadow-none';

// The round lesson button from DESIGN_SYSTEM §6 (LessonNode): 64 px circle,
// Ink when done, pulsing Orange for "your move now", gray when locked.
// Purely visual; the caller wraps it in a link when it should be clickable.
// `pop` plays the unlock pop once (for a node that just changed state).
export function LessonNode({
  state,
  pop = false,
}: {
  state: LessonState;
  pop?: boolean;
}) {
  if (state === 'completed') {
    return (
      <span
        className={`flex size-16 items-center justify-center rounded-node border-[3px] border-black bg-ink text-paper shadow-press-ink ${PRESS} ${pop ? 'animate-pop' : ''}`}
      >
        <Check className="size-7" strokeWidth={3.5} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        className={`relative flex size-16 items-center justify-center rounded-node border-[3px] border-orange-dark bg-orange text-ink shadow-press-orange ${PRESS} ${pop ? 'animate-pop' : 'animate-pulse-node'}`}
      >
        <Star className="size-7" strokeWidth={3} fill="currentColor" />
        {/* Above the node, so it never runs off a narrow screen. */}
        <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-badge bg-ink px-2 py-0.5 text-xs font-bold whitespace-nowrap text-paper">
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
