import Link from 'next/link';
import { useId } from 'react';

// The loop (docs/DESIGN_SYSTEM.md §9, ADR-047): one stroke that rises,
// loops into a cursive "l" and ends in a dot. Ink on a Sunflower tile on
// light pages; `tone="violet"` is the app icon's Sunflower on Violet.
export function LoopMark({
  className = 'size-8',
  tone = 'sun',
  drawing = false,
}: {
  className?: string;
  tone?: 'sun' | 'violet';
  // The loading screen: the loop draws itself over and over.
  drawing?: boolean;
}) {
  const id = useId();
  const sun = tone === 'sun';
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sun ? '#ffd650' : '#7a60ff'} />
          <stop offset="1" stopColor={sun ? '#ffbc0a' : '#6a4df4'} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill={`url(#${id})`} />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="30"
        rx="15"
        fill="#fff"
        opacity={sun ? 0.2 : 0.14}
      />
      <path
        d="M16 47 C27 41 43 29 43 19 C43 12 37 9.5 33.5 12 C29.5 15 29 23 31 31 C32.5 38 35 44 39.5 47"
        fill="none"
        stroke={sun ? '#1e1638' : '#ffc21a'}
        strokeWidth="6.5"
        strokeLinecap="round"
        {...(drawing && {
          pathLength: 1,
          strokeDasharray: '1 1',
          className: 'animate-loop-draw',
        })}
      />
      <circle cx="47.5" cy="46.5" r="4.6" fill={sun ? '#1e1638' : '#ffc21a'} />
    </svg>
  );
}

// The Loophole logo: the loop mark, then the wordmark in Lexend, all
// lowercase, Ink.
export function Logo({
  href,
  size = 'md',
}: {
  href: string;
  size?: 'sm' | 'md';
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
    >
      <LoopMark className={size === 'sm' ? 'size-7' : 'size-9'} />
      <span
        className={`font-display font-semibold tracking-tight ${size === 'sm' ? 'text-lg' : 'text-2xl'}`}
      >
        loophole
      </span>
    </Link>
  );
}
