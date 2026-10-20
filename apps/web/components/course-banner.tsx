import { LanguageLogo, hasLanguageLogo } from '@/components/language-logo';

// Each course's own banner (ADR-027), drawn by hand in SVG like the path
// and Byte: a tint of the language's colour, a dotted track, code stickers
// from the course and its logo on a big Paper sticker. Wide screens show
// it all; narrow ones crop from the left, so the logo always shows.

type Sticker = { text: string; fill: string };

const LOOKS: Record<string, { tint: string; stickers: Sticker[] }> = {
  python: {
    tint: '#D6E4F5',
    stickers: [
      { text: 'print("hi")', fill: 'fill-paper' },
      { text: 'def greet():', fill: 'fill-lemon' },
      { text: 'for x in', fill: 'fill-blue-tint' },
      { text: '# notes', fill: 'fill-pink' },
    ],
  },
  javascript: {
    tint: '#FFF1A8',
    stickers: [
      { text: 'console.log()', fill: 'fill-paper' },
      { text: 'const x = 1', fill: 'fill-pink' },
      { text: '() => {}', fill: 'fill-blue-tint' },
      { text: 'if (ok)', fill: 'fill-paper' },
    ],
  },
  html: {
    tint: '#FFD9CC',
    stickers: [
      { text: '<h1>Hi</h1>', fill: 'fill-paper' },
      { text: 'color: blue;', fill: 'fill-lemon' },
      { text: '<a href>', fill: 'fill-blue-tint' },
      { text: '</>', fill: 'fill-pink' },
    ],
  },
  git: {
    tint: '#E4DEFA',
    stickers: [
      { text: 'git commit', fill: 'fill-paper' },
      { text: 'main', fill: 'fill-lemon' },
      { text: 'git push', fill: 'fill-blue-tint' },
      { text: 'merge', fill: 'fill-pink' },
    ],
  },
};

const FALLBACK = {
  tint: '#ECE7FB',
  stickers: [
    { text: 'run()', fill: 'fill-paper' },
    { text: '{ }', fill: 'fill-lemon' },
    { text: '</>', fill: 'fill-blue-tint' },
    { text: '#', fill: 'fill-pink' },
  ],
};

// Where the four stickers sit on the 640 × 180 banner, and their tilt.
// The first starts past x 60, so a catalog card's crop only nicks it.
const SPOTS = [
  { x: 64, y: 26, rotate: -6 },
  { x: 150, y: 108, rotate: 4 },
  { x: 286, y: 30, rotate: -3 },
  { x: 318, y: 116, rotate: 6 },
];

// JetBrains Mono at 17 px is about 10.2 px per character.
const CHAR = 10.2;

export function CourseBanner({
  language,
  className = '',
}: {
  language: string;
  className?: string;
}) {
  const look = LOOKS[language] ?? FALLBACK;

  return (
    <svg
      aria-hidden
      viewBox="0 0 640 180"
      preserveAspectRatio="xMaxYMid slice"
      className={`block w-full ${className}`}
    >
      <rect width="640" height="180" fill={look.tint} />
      <path
        d="M-10 150 C 120 60, 250 190, 400 110 S 520 50, 660 80"
        fill="none"
        className="stroke-ink"
        strokeOpacity={0.25}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="0 13"
      />

      {look.stickers.map((sticker, i) => {
        const spot = SPOTS[i];
        const width = Math.round(sticker.text.length * CHAR + 28);
        return (
          <g
            key={sticker.text}
            transform={`translate(${spot.x} ${spot.y}) rotate(${spot.rotate})`}
          >
            <rect
              x="4"
              y="4"
              width={width}
              height="38"
              rx="8"
              className="fill-ink"
            />
            <rect
              width={width}
              height="38"
              rx="8"
              className={`${sticker.fill} stroke-ink`}
              strokeWidth={2.5}
            />
            <text
              x={width / 2}
              y="25"
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              className="fill-ink font-mono"
            >
              {sticker.text}
            </text>
          </g>
        );
      })}

      {/* The logo on a big Paper sticker, tilted like the landing page's. */}
      <g transform="translate(500 36) rotate(-6 54 54)">
        <rect
          x="6"
          y="6"
          width="108"
          height="108"
          rx="18"
          className="fill-ink"
        />
        <rect
          width="108"
          height="108"
          rx="18"
          className="fill-paper stroke-ink"
          strokeWidth={3}
        />
        {hasLanguageLogo(language) ? (
          <svg x="22" y="22" width="64" height="64" viewBox="0 0 24 24">
            <LanguageLogo language={language} />
          </svg>
        ) : (
          <text
            x="54"
            y="66"
            textAnchor="middle"
            fontSize="30"
            fontWeight="700"
            className="fill-ink font-mono"
          >
            {language.slice(0, 3)}
          </text>
        )}
      </g>
    </svg>
  );
}
