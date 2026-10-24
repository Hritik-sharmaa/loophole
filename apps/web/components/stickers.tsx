import { useId } from 'react';

// Stickers (docs/DESIGN_SYSTEM.md §9, ADR-047): small glossy icons for
// rewards and moments. A coin for XP, a flame for streaks, a trophy for
// wins, a bug for bugs, swords for duels. Decorative: always pass the
// meaning in text next to them.

type Props = { className?: string };

export function CoinSticker({ className = 'size-5' }: Props) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffe98f" />
          <stop offset=".5" stopColor="#ffc21a" />
          <stop offset="1" stopColor="#d98f00" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="25.5" r="19" fill="#c27f00" />
      <circle cx="24" cy="23.5" r="19" fill={`url(#${id})`} />
      <circle
        cx="24"
        cy="23.5"
        r="13.5"
        fill="none"
        stroke="#fff"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      <path
        d="M24 14.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"
        fill="#b97400"
        opacity=".8"
      />
    </svg>
  );
}

export function FlameSticker({ className = 'size-5' }: Props) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff4d1f" />
          <stop offset=".55" stopColor="#ff8f1f" />
          <stop offset="1" stopColor="#ffcf3f" />
        </linearGradient>
      </defs>
      <path
        d="M24 3C31 11 39 18 39 29 39 38.5 32 45 24 45S9 38.5 9 29c0-7 4-12.5 8.5-16.5 0 6 3 9.5 6.5 9.5-2.5-6.5-2.5-13.5 0-19z"
        fill={`url(#${id})`}
      />
      <path
        d="M24 25c4.5 4.5 7.5 7.5 7.5 11.5S28 43 24 43s-7.5-2.5-7.5-6.5S20.5 29.5 24 25z"
        fill="#ffe27a"
      />
    </svg>
  );
}

export function TrophySticker({ className = 'size-5' }: Props) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe17a" />
          <stop offset=".5" stopColor="#ffbe14" />
          <stop offset="1" stopColor="#d48a00" />
        </linearGradient>
      </defs>
      <path
        d="M14 10C8 10 6 13 6.5 16.5 7.2 21.5 11.5 24 16 24.5M34 10c6 0 8 3 7.5 6.5C40.8 21.5 36.5 24 32 24.5"
        fill="none"
        stroke="#e0a000"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d="M13 6h22v12c0 7-5 12-11 12S13 25 13 18z" fill={`url(#${id})`} />
      <rect x="21" y="29" width="6" height="7" fill="#d48a00" />
      <rect x="14" y="36" width="20" height="7" rx="3" fill="#1e1638" />
      <ellipse cx="18.5" cy="12" rx="2.2" ry="4.6" fill="#fff" opacity=".55" />
    </svg>
  );
}

export function BugSticker({ className = 'size-5' }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <g stroke="#1e1638" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M12 22l-6-3M11 30H5M13 37l-5 4M36 22l6-3M37 30h6M35 37l5 4M20 10l-3-5M28 10l3-5" />
      </g>
      <circle cx="24" cy="13" r="6" fill="#1e1638" />
      <ellipse cx="24" cy="29" rx="12.5" ry="14" fill="#ff7a93" />
      <path d="M24 16v27" stroke="#c8243a" strokeWidth="1.6" />
      <circle cx="18.5" cy="26" r="2.6" fill="#1e1638" />
      <circle cx="29.5" cy="26" r="2.6" fill="#1e1638" />
      <circle cx="19.5" cy="35" r="2" fill="#1e1638" />
      <circle cx="28.5" cy="35" r="2" fill="#1e1638" />
    </svg>
  );
}

export function SwordsSticker({ className = 'size-5' }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M10 8l20 20M38 8L18 28"
        stroke="#e9e6f2"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M10 8l20 20M38 8L18 28"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M26 30l6-6M22 30l-6-6"
        stroke="#ffc21a"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M32 30l6 6M16 30l-6 6"
        stroke="#1e1638"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// A four-point sparkle, in the current text colour. Used as decoration
// around headings and in the yellow pill on the landing headline.
export function Sparkle({ className = 'size-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

const TILE_TONES = {
  pink: 'from-[#ffb3d6] to-[#ff7fb6]',
  lilac: 'from-[#cdbdff] to-[#9f86ff]',
  sky: 'from-[#a6deff] to-[#5db7f5]',
  orange: 'from-[#ffc98f] to-[#ff9a3d]',
  mint: 'from-[#a8ecd2] to-[#52c99e]',
  sun: 'from-[#ffe07a] to-[#ffbf12]',
} as const;

export type TileTone = keyof typeof TILE_TONES;

// A 3D-looking rounded square for an icon: a pastel gradient, a gloss
// across the top and a soft shadow underneath (the Ruang Edit tiles).
export function Tile({
  tone,
  className = 'size-12',
  children,
}: {
  tone: TileTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-[28%] bg-gradient-to-b ${TILE_TONES[tone]} shadow-[inset_0_-5px_0_rgb(0_0_0/0.08),inset_0_2px_0_rgb(255_255_255/0.7),0_14px_22px_-14px_rgb(60_30_120/0.55)] ${className}`}
    >
      <span className="pointer-events-none absolute inset-x-[12%] top-[7%] h-[32%] rounded-full bg-gradient-to-b from-white/55 to-white/0" />
      <span className="relative z-10 grid size-[62%] place-items-center drop-shadow-[0_6px_5px_rgb(40_20_90/0.28)] [&>svg]:size-full">
        {children}
      </span>
    </span>
  );
}
