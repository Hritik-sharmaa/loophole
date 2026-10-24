import { useId } from 'react';
import { LanguageLogo, hasLanguageLogo } from '@/components/language-logo';

// Each course's own banner (ADR-027, redrawn in ADR-047): a soft gradient
// in the course's pastel (the same as its landing-page tile), white code
// pills with a soft shadow, sparkles, and the language logo on a glossy
// 3D tile. Wide screens show it all; narrow ones crop from the left, so
// the tile always shows.

type Look = {
  // Background gradient, top to bottom.
  bg: [string, string];
  // The tile's gradient.
  tile: [string, string];
  pills: string[];
};

const LOOKS: Record<string, Look> = {
  python: {
    bg: ['#FFE6F2', '#FFCCE3'],
    tile: ['#FFB3D6', '#FF7FB6'],
    pills: ['print("hi")', 'def greet():', 'for x in', '# notes'],
  },
  javascript: {
    bg: ['#EFEAFF', '#DCD2FF'],
    tile: ['#CDBDFF', '#9F86FF'],
    pills: ['console.log()', 'const x = 1', '() => {}', 'if (ok)'],
  },
  html: {
    bg: ['#E4F4FF', '#C9E8FD'],
    tile: ['#A6DEFF', '#5DB7F5'],
    pills: ['<h1>Hi</h1>', 'color: blue;', '<a href>', '</>'],
  },
  git: {
    bg: ['#FFEEDD', '#FFD9B5'],
    tile: ['#FFC98F', '#FF9A3D'],
    pills: ['git commit', 'main', 'git push', 'merge'],
  },
};

const FALLBACK: Look = {
  bg: ['#EFEAFF', '#DCD2FF'],
  tile: ['#CDBDFF', '#9F86FF'],
  pills: ['run()', '{ }', '</>', '#'],
};

// Where the four pills sit on the 640 × 180 banner, and their tilt. The
// first starts past x 60, so a catalog card's crop only nicks it.
const SPOTS = [
  { x: 64, y: 30, rotate: -5 },
  { x: 140, y: 110, rotate: 3 },
  { x: 288, y: 36, rotate: -2 },
  { x: 314, y: 118, rotate: 5 },
];

// JetBrains Mono at 16 px is about 9.6 px per character.
const CHAR = 9.6;

const SPARK =
  'M0 -12C1 -5 5 -1 12 0C5 1 1 5 0 12C-1 5 -5 1 -12 0C-5 -1 -1 -5 0 -12Z';

export function CourseBanner({
  language,
  className = '',
}: {
  language: string;
  className?: string;
}) {
  const look = LOOKS[language] ?? FALLBACK;
  const id = useId();
  const bg = `${id}-bg`;
  const tile = `${id}-tile`;
  const gloss = `${id}-gloss`;
  const soft = `${id}-soft`;

  return (
    <svg
      aria-hidden
      viewBox="0 0 640 180"
      preserveAspectRatio="xMaxYMid slice"
      className={`block w-full ${className}`}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.bg[0]} />
          <stop offset="1" stopColor={look.bg[1]} />
        </linearGradient>
        <linearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.tile[0]} />
          <stop offset="1" stopColor={look.tile[1]} />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={soft} x="-30%" y="-30%" width="160%" height="190%">
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="9"
            floodColor="#3c1e78"
            floodOpacity="0.22"
          />
        </filter>
      </defs>

      <rect width="640" height="180" fill={`url(#${bg})`} />
      <circle cx="560" cy="170" r="90" fill="#fff" opacity="0.25" />
      <path
        d="M-10 150 C 120 60, 250 190, 400 110 S 520 50, 660 80"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.9}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="0 13"
      />
      <g fill="#6A4DF4">
        <path d={SPARK} transform="translate(250 96) scale(.8)" />
        <path d={SPARK} transform="translate(460 30) scale(.55)" opacity=".7" />
      </g>
      <path d={SPARK} transform="translate(440 150) scale(.6)" fill="#fff" />

      {look.pills.map((text, i) => {
        const spot = SPOTS[i];
        const width = Math.round(text.length * CHAR + 32);
        const accent = i === 2;
        return (
          <g
            key={text}
            transform={`translate(${spot.x} ${spot.y}) rotate(${spot.rotate})`}
            filter={`url(#${soft})`}
          >
            <rect
              width={width}
              height="36"
              rx="18"
              fill={accent ? '#6A4DF4' : '#fff'}
            />
            <text
              x={width / 2}
              y="23.5"
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill={accent ? '#fff' : '#1E1638'}
              className="font-mono"
            >
              {text}
            </text>
          </g>
        );
      })}

      {/* The logo on a glossy 3D tile. */}
      <g
        transform="translate(498 34) rotate(-6 56 56)"
        filter={`url(#${soft})`}
      >
        <rect width="112" height="112" rx="30" fill={`url(#${tile})`} />
        <rect
          x="0"
          y="104"
          width="112"
          height="8"
          rx="4"
          fill="#000"
          opacity="0.06"
        />
        <rect
          x="14"
          y="7"
          width="84"
          height="34"
          rx="17"
          fill={`url(#${gloss})`}
        />
        <rect x="22" y="22" width="68" height="68" rx="18" fill="#fff" />
        {hasLanguageLogo(language) ? (
          <svg x="32" y="32" width="48" height="48" viewBox="0 0 24 24">
            <LanguageLogo language={language} />
          </svg>
        ) : (
          <text
            x="56"
            y="66"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="#1E1638"
            className="font-mono"
          >
            {language.slice(0, 3)}
          </text>
        )}
      </g>
    </svg>
  );
}
