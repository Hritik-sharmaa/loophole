import type { LessonState } from '@loophole/shared';
import { Check, Hammer, Lock, Star } from 'lucide-react';
import { chip } from '@/components/ui/card';

// Press feel (DESIGN_SYSTEM §4): inside a `group` link, the node drops 4 px
// and its shadow collapses while pressed.
const PRESS =
  'transition-[translate,box-shadow] duration-[50ms] group-active:translate-y-1 group-active:shadow-none';

// The round lesson button from DESIGN_SYSTEM §6 (LessonNode): 64 px circle
// with an Ink outline. Blue when done, pulsing Orange for "your move now",
// a dashed outline when locked (not stuck on yet).
// Purely visual; the caller wraps it in a link when it should be clickable.
// `pop` plays the unlock pop once (for a node that just changed state).
// `project` (ADR-043): a unit's checkpoint project shows a hammer, and
// its "your move" tag says what it is worth.
export function LessonNode({
  state,
  pop = false,
  project = false,
}: {
  state: LessonState;
  pop?: boolean;
  project?: boolean;
}) {
  if (state === 'completed') {
    return (
      <span
        className={`flex size-16 items-center justify-center rounded-node border-[3px] border-ink bg-blue text-paper shadow-press ${PRESS} ${pop ? 'animate-pop' : ''}`}
      >
        <Check className="size-7" strokeWidth={3.5} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        className={`relative flex size-16 items-center justify-center rounded-node border-[3px] border-ink bg-orange text-ink shadow-press ${PRESS} ${pop ? 'animate-pop' : 'animate-pulse-node'}`}
      >
        {project ? (
          <Hammer className="size-7" strokeWidth={2.75} />
        ) : (
          <Star className="size-7" strokeWidth={3} fill="currentColor" />
        )}
        {/* Above the node, so it never runs off a narrow screen. */}
        <span
          className={`${chip} absolute bottom-full left-1/2 mb-2 -translate-x-1/2 -rotate-3 whitespace-nowrap text-ink ${project ? 'bg-pink' : 'bg-lemon'}`}
        >
          {project ? 'Project · +30 XP' : 'Start here'}
        </span>
      </span>
    );
  }
  return (
    <span className="flex size-16 items-center justify-center rounded-node border-[3px] border-dashed border-border-muted bg-paper text-text-tertiary">
      {project ? (
        <Hammer className="size-6" strokeWidth={2.75} />
      ) : (
        <Lock className="size-6" strokeWidth={3} />
      )}
    </span>
  );
}
