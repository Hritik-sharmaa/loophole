import type { LessonState } from '@loophole/shared';
import { chip } from '@/components/ui/card';

// A lesson on the map (DESIGN_SYSTEM §6 LessonNode, ADR-047): a little
// book standing on the road, numbered. Done books keep their colour and
// get a Violet tick; the book to start is Violet with a Sunflower glow
// that breathes; locked books are pale with a lock. A unit's project
// (ADR-043) is the house at the end of the road.
// Purely visual; the caller wraps it in a link when it should be clickable.
// `pop` plays the unlock pop once (for a node that just changed state).

// Done books cycle through the tile pastels so a finished unit looks like
// a shelf, not a row of identical buttons.
const COVERS = [
  '#FFD43B',
  '#FF9CC8',
  '#82CCF8',
  '#7FDDB8',
  '#FFB56B',
  '#B7A3FF',
];

export function LessonNode({
  state,
  number,
  pop = false,
  project = false,
}: {
  state: LessonState;
  // The lesson's place in the course, 1-based: printed on the cover.
  number: number;
  pop?: boolean;
  project?: boolean;
}) {
  const tilt = number % 2 === 0 ? 'rotate-[4deg]' : '-rotate-[4deg]';
  return (
    <span
      className={`relative block transition-transform duration-150 group-hover:-translate-y-1 group-active:scale-95 ${pop ? 'animate-pop' : ''}`}
    >
      {state === 'active' && (
        <>
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 animate-pulse-node rounded-full bg-sun/35"
          />
          {/* Above the book, so it never runs off a narrow screen. */}
          <span
            className={`${chip} absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 border-transparent whitespace-nowrap ${project ? 'bg-pink text-ink' : 'bg-ink text-paper'}`}
          >
            {project ? 'Project · +30 XP' : 'Start here'}
          </span>
        </>
      )}
      <span className={`relative block ${project ? '' : tilt}`}>
        {project ? (
          <House state={state} />
        ) : (
          <Book state={state} number={number} />
        )}
      </span>
    </span>
  );
}

function Book({ state, number }: { state: LessonState; number: number }) {
  const cover =
    state === 'active'
      ? '#6A4DF4'
      : state === 'locked'
        ? '#ECE8F6'
        : COVERS[(number - 1) % COVERS.length];
  const ink =
    state === 'active' ? '#FFC21A' : state === 'locked' ? '#B4ADC8' : '#1E1638';
  return (
    <svg
      viewBox="0 0 64 76"
      className="block h-[76px] w-16 drop-shadow-[0_10px_10px_rgb(60_30_120/0.25)]"
      aria-hidden
    >
      {/* Pages peeking out, then the cover and its spine. */}
      <rect x="6" y="4" width="54" height="68" rx="6" fill="#FFFFFF" />
      <rect x="2" y="2" width="54" height="70" rx="7" fill={cover} />
      <rect x="2" y="2" width="8" height="70" rx="4" fill="#000" opacity=".1" />
      <rect
        x="14"
        y="10"
        width="34"
        height="4"
        rx="2"
        fill="#fff"
        opacity=".45"
      />
      <text
        x="31"
        y="50"
        textAnchor="middle"
        fontSize="24"
        fontWeight="600"
        fill={ink}
        className="font-display"
      >
        {number}
      </text>
      {state === 'completed' && (
        <g transform="translate(52 10)">
          <circle r="10" fill="#6A4DF4" stroke="#fff" strokeWidth="2.5" />
          <path
            d="M-4.5 0l3 3 6-6.5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {state === 'locked' && (
        <g transform="translate(52 10)">
          <circle r="10" fill="#fff" />
          <rect
            x="-4.5"
            y="-1.5"
            width="9"
            height="7"
            rx="1.6"
            fill="#A49DB8"
          />
          <path
            d="M-2.8 -1.5v-2a2.8 2.8 0 0 1 5.6 0v2"
            fill="none"
            stroke="#A49DB8"
            strokeWidth="1.8"
          />
        </g>
      )}
    </svg>
  );
}

// The unit's project: a little house at the end of the road.
function House({ state }: { state: LessonState }) {
  const locked = state === 'locked';
  const walls = locked ? '#ECE8F6' : '#FF9CC8';
  const roof = locked ? '#CFC8E0' : '#6A4DF4';
  return (
    <svg
      viewBox="0 0 76 72"
      className="block h-[72px] w-[76px] drop-shadow-[0_10px_10px_rgb(60_30_120/0.25)]"
      aria-hidden
    >
      <rect x="12" y="30" width="52" height="38" rx="5" fill={walls} />
      <path d="M4 34 L38 6 L72 34 Z" fill={roof} strokeLinejoin="round" />
      <rect x="52" y="12" width="7" height="14" rx="2" fill={roof} />
      <rect x="31" y="46" width="14" height="22" rx="3" fill="#fff" />
      <rect x="18" y="38" width="10" height="9" rx="2" fill="#fff" />
      <rect x="48" y="38" width="10" height="9" rx="2" fill="#fff" />
      {state === 'completed' && (
        <g transform="translate(64 14)">
          <circle r="10" fill="#6A4DF4" stroke="#fff" strokeWidth="2.5" />
          <path
            d="M-4.5 0l3 3 6-6.5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {locked && (
        <g transform="translate(64 14)">
          <circle r="10" fill="#fff" />
          <rect
            x="-4.5"
            y="-1.5"
            width="9"
            height="7"
            rx="1.6"
            fill="#A49DB8"
          />
          <path
            d="M-2.8 -1.5v-2a2.8 2.8 0 0 1 5.6 0v2"
            fill="none"
            stroke="#A49DB8"
            strokeWidth="1.8"
          />
        </g>
      )}
    </svg>
  );
}
