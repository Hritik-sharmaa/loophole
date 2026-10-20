import type { CSSProperties, ReactNode } from 'react';

// The crew (ADR-028): one guide per course, drawn flat with no outlines
// (the one exception to "everything is a sticker", DESIGN_SYSTEM §9). They
// teach the Learn cards, read out the task, voice the AI tutor and cheer
// when a lesson is done. Each wears their course's colour; the mood
// changes both face and pose. Byte stays as the logo and app icon only.

export type GuideMood = 'idle' | 'happy' | 'thinking' | 'oops';
export type GuideId = 'priya' | 'arjun' | 'meera' | 'harpreet';

type Look = {
  name: string;
  // What they say when a lesson is done.
  cheer: string;
  skin: string;
  shade: string;
  hair: string;
  hairHi: string;
  top: string;
  topShade: string;
  pants: string;
  shoes: string;
  // The background tint behind them: their course banner's tint.
  tint: string;
  // A long kurti instead of a hoodie.
  long?: boolean;
};

export const GUIDES: Record<GuideId, Look> = {
  priya: {
    name: 'Priya',
    cheer: 'Shabaash!',
    skin: '#B5784A',
    shade: '#93603A',
    hair: '#1F1414',
    hairHi: '#3E2A26',
    top: '#3776AB',
    topShade: '#2A5D88',
    pants: '#F3E9D2',
    shoes: '#FFD84D',
    tint: '#D6E4F5',
    long: true,
  },
  arjun: {
    name: 'Arjun',
    cheer: 'Badhiya!',
    skin: '#8D5524',
    shade: '#6F4120',
    hair: '#1B1433',
    hairHi: '#3A2F5C',
    top: '#F7DF1E',
    topShade: '#D9C21A',
    pants: '#2F4AD0',
    shoes: '#FFFFFF',
    tint: '#FFF1A8',
  },
  meera: {
    name: 'Meera',
    cheer: 'Wah!',
    skin: '#D29A66',
    shade: '#B47E4E',
    hair: '#231A1A',
    hairHi: '#4A3A36',
    top: '#E34F26',
    topShade: '#B83D1C',
    pants: '#F3E9D2',
    shoes: '#FF7AB6',
    tint: '#FFD9CC',
    long: true,
  },
  harpreet: {
    name: 'Harpreet',
    cheer: 'Balle balle!',
    skin: '#C68642',
    shade: '#A26A2C',
    hair: '#241A1A',
    hairHi: '#4A3A36',
    top: '#2A2147',
    topShade: '#1B1433',
    pants: '#4361FF',
    shoes: '#FFFFFF',
    tint: '#E4DEFA',
  },
};

// Who teaches each course language. Anything else (duels, the profile,
// pages with no course) gets Priya, who teaches the first course.
const BY_LANGUAGE: Record<string, GuideId> = {
  python: 'priya',
  javascript: 'arjun',
  html: 'meera',
  git: 'harpreet',
};

export function guideFor(language: string | undefined): GuideId {
  return (language && BY_LANGUAGE[language]) || 'priya';
}

const INK = '#1B1433';
const MOUTH = '#5A1E33';
const LEMON = '#FFD84D';
const PINK = '#FF7AB6';

// `full` is the whole person (5:7); `bust` crops to head and shoulders for
// small spots like a speech bubble or the tutor panel.
const VIEW_BOX = { full: '0 0 200 280', bust: '14 0 172 172' };

export function Guide({
  guide,
  mood = 'idle',
  crop = 'full',
  className,
  style,
  label,
}: {
  guide: GuideId;
  mood?: GuideMood;
  crop?: keyof typeof VIEW_BOX;
  className?: string;
  style?: CSSProperties;
  // Pass when the guide means something on their own; otherwise they are
  // decoration and hidden from screen readers.
  label?: string;
}) {
  const c = GUIDES[guide];
  return (
    <svg
      viewBox={VIEW_BOX[crop]}
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {crop === 'full' && (
        <ellipse cx="100" cy="270" rx="52" ry="7" fill={INK} opacity="0.12" />
      )}
      <BackHair guide={guide} c={c} />
      <rect x="78" y="208" width="19" height="52" rx="8" fill={c.pants} />
      <rect x="103" y="208" width="19" height="52" rx="8" fill={c.pants} />
      <rect x="68" y="252" width="31" height="16" rx="8" fill={c.shoes} />
      <rect x="101" y="252" width="31" height="16" rx="8" fill={c.shoes} />
      <rect x="88" y="112" width="24" height="26" rx="6" fill={c.shade} />
      <path
        d={
          c.long
            ? 'M66 146 C66 134 76 128 88 128 L112 128 C124 128 134 134 134 146 L142 222 C142 230 136 234 128 234 L72 234 C64 234 58 230 58 222 Z'
            : 'M66 146 C66 134 76 128 88 128 L112 128 C124 128 134 134 134 146 L138 206 C138 214 132 218 124 218 L76 218 C68 218 62 214 62 206 Z'
        }
        fill={c.top}
      />
      <Outfit guide={guide} c={c} />
      <circle cx="53" cy="80" r="10" fill={c.skin} />
      <circle cx="147" cy="80" r="10" fill={c.skin} />
      <circle cx="54" cy="80" r="5" fill={c.shade} />
      <circle cx="146" cy="80" r="5" fill={c.shade} />
      <rect x="52" y="24" width="96" height="100" rx="42" fill={c.skin} />
      <Face guide={guide} mood={mood} c={c} />
      <FrontHair guide={guide} c={c} />
      <Arms mood={mood} c={c} />
      {guide === 'priya' && <Braid c={c} />}
      <Extras mood={mood} />
    </svg>
  );
}

// All four side by side, for pages that belong to no one course (the
// profile, a certificate, the landing page).
export function CrewLineup({
  mood = 'idle',
  size = 'md',
  className = '',
}: {
  mood?: GuideMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = { sm: 'h-20 w-[57px]', md: 'h-28 w-20', lg: 'h-40 w-[114px]' }[
    size
  ];
  return (
    <div aria-hidden className={`flex items-end -space-x-2 ${className}`}>
      {(Object.keys(GUIDES) as GuideId[]).map((id) => (
        <Guide key={id} guide={id} mood={mood} className={box} />
      ))}
    </div>
  );
}

// A guide beside a speech bubble: how the crew talks to the learner.
export function GuideSays({
  guide,
  mood = 'idle',
  children,
  className = '',
}: {
  guide: GuideId;
  mood?: GuideMood;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <Guide
        guide={guide}
        mood={mood}
        className="h-28 w-20 shrink-0 sm:h-36 sm:w-[103px]"
      />
      <div className="relative mb-6 min-w-0 flex-1 rounded-card border-2 border-ink bg-paper px-4 py-3 shadow-sticker-sm">
        {/* The bubble's tail, pointing at the guide. */}
        <span
          aria-hidden
          className="absolute bottom-4 -left-[9px] size-4 rotate-45 border-b-2 border-l-2 border-ink bg-paper"
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function Limb({ d, color }: { d: string; color: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={19}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// The pose is the mood: arms down, cheering, hand on chin, or a shrug.
function Arms({ mood, c }: { mood: GuideMood; c: Look }) {
  const arms = {
    idle: {
      paths: ['M74 142 L62 194', 'M126 142 L138 194'],
      hands: [
        [60, 200],
        [140, 200],
      ],
    },
    happy: {
      paths: ['M74 142 L52 104', 'M126 142 L148 104'],
      hands: [
        [50, 98],
        [150, 98],
      ],
    },
    thinking: {
      paths: ['M74 142 L62 194', 'M126 144 L144 172 L124 132'],
      hands: [
        [60, 200],
        [120, 126],
      ],
    },
    oops: {
      paths: ['M74 142 Q54 170 42 150', 'M126 142 Q146 170 158 150'],
      hands: [
        [40, 146],
        [160, 146],
      ],
    },
  }[mood];
  return (
    <>
      {arms.paths.map((d) => (
        <Limb key={d} d={d} color={c.top} />
      ))}
      {arms.hands.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r="10" fill={c.skin} />
      ))}
    </>
  );
}

function BackHair({ guide, c }: { guide: GuideId; c: Look }) {
  if (guide === 'priya') {
    return (
      <path
        d="M48 82 C44 30 74 16 100 16 C126 16 156 30 152 82 L150 116 L50 116 Z"
        fill={c.hair}
      />
    );
  }
  if (guide === 'meera') {
    // A high ponytail swinging out behind her head.
    return (
      <path
        d="M104 20 C130 0 166 20 164 62 C162 86 152 100 144 104 C150 80 150 50 128 34 C120 28 112 26 104 28 Z"
        fill={c.hair}
      />
    );
  }
  return null;
}

// Necklines and trims, drawn over the torso.
function Outfit({ guide, c }: { guide: GuideId; c: Look }) {
  const hem = <path d="M58.5 219 L141.5 219 L142 227 L58 227 Z" fill={LEMON} />;
  if (guide === 'priya') {
    return (
      <>
        <path
          d="M86 128 Q100 146 114 128"
          fill="none"
          stroke={LEMON}
          strokeWidth={5}
          strokeLinecap="round"
        />
        {hem}
      </>
    );
  }
  if (guide === 'meera') {
    return (
      <>
        <path
          d="M84 128 Q100 152 116 128"
          fill="none"
          stroke={LEMON}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d="M86 136 Q100 156 114 136"
          fill="none"
          stroke={LEMON}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="0.1 6"
        />
        <path
          d="M100 150 L100 186"
          stroke={c.topShade}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx="100" cy="158" r="2.6" fill={LEMON} />
        <circle cx="100" cy="168" r="2.6" fill={LEMON} />
        <circle cx="100" cy="178" r="2.6" fill={LEMON} />
        {hem}
      </>
    );
  }
  // Hoodies: the hood, and strings (Ink on Arjun's yellow, white on navy).
  return (
    <>
      <path
        d="M78 130 Q100 148 122 130 L122 124 Q100 140 78 124 Z"
        fill={c.topShade}
      />
      {guide === 'arjun' && (
        <rect x="80" y="182" width="40" height="18" rx="8" fill={c.topShade} />
      )}
      <path
        d="M93 140 L92 160 M107 140 L108 160"
        stroke={guide === 'arjun' ? INK : '#FFFFFF'}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </>
  );
}

function FrontHair({ guide, c }: { guide: GuideId; c: Look }) {
  if (guide === 'priya') {
    return (
      <>
        <path
          d="M50 78 C48 34 72 20 100 20 C128 20 152 34 150 78 C146 56 126 42 100 42 C74 42 54 56 50 78 Z"
          fill={c.hair}
        />
        {/* Centre parting. */}
        <path
          d="M100 22 L100 40"
          stroke={c.skin}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Shine d="M66 42 Q76 30 90 28" c={c} />
      </>
    );
  }
  if (guide === 'arjun') {
    return (
      <>
        <rect x="52" y="56" width="10" height="22" rx="4" fill={c.hair} />
        <rect x="138" y="56" width="10" height="22" rx="4" fill={c.hair} />
        <path
          d="M50 70 C46 32 70 16 102 16 C132 16 154 32 150 66 C144 50 128 42 110 42 C96 36 74 38 62 50 C56 56 52 62 50 70 Z"
          fill={c.hair}
        />
        <path
          d="M66 26 C78 8 108 6 126 18 C108 16 92 22 84 34 Z"
          fill={c.hair}
        />
        <Shine d="M84 22 Q100 12 116 16" c={c} />
      </>
    );
  }
  if (guide === 'meera') {
    return (
      <>
        <path
          d="M50 74 C48 34 74 20 100 20 C128 20 152 34 150 72 C140 50 120 42 100 42 C78 42 58 52 50 74 Z"
          fill={c.hair}
        />
        <Shine d="M68 38 Q82 28 98 27" c={c} />
        <rect
          x="104"
          y="14"
          width="18"
          height="11"
          rx="5"
          fill={LEMON}
          transform="rotate(-30 113 19)"
        />
      </>
    );
  }
  // Harpreet's turban, its folds meeting at the front.
  return (
    <>
      <path
        d="M48 62 C42 14 76 2 100 2 C124 2 158 14 152 62 C140 48 122 42 100 50 C78 42 60 48 48 62 Z"
        fill="#F05032"
      />
      <path
        d="M52 50 Q76 26 100 48 M54 34 Q80 12 100 34 M148 50 Q124 26 100 48 M146 34 Q120 12 100 34"
        fill="none"
        stroke="#C9391F"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    </>
  );
}

function Shine({ d, c }: { d: string; c: Look }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={c.hairHi}
      strokeWidth={4}
      strokeLinecap="round"
    />
  );
}

// Priya's braid lies over her shoulder, in front of her arm.
function Braid({ c }: { c: Look }) {
  return (
    <>
      <ellipse cx="121" cy="133" rx="9" ry="10" fill={c.hair} />
      <ellipse cx="123" cy="148" rx="9" ry="10" fill={c.hair} />
      <ellipse cx="125" cy="162" rx="8" ry="9" fill={c.hair} />
      <ellipse cx="126" cy="175" rx="7" ry="8" fill={c.hair} />
      <path
        d="M117 129 Q123 135 127 131 M119 144 Q125 150 129 146 M121 158 Q127 164 130 160"
        fill="none"
        stroke={c.hairHi}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <rect x="121" y="182" width="10" height="7" rx="3" fill={LEMON} />
      <path
        d="M123 189 L121 199 M126 189 L126 200 M129 189 L131 199"
        stroke={c.hair}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </>
  );
}

function Face({
  guide,
  mood,
  c,
}: {
  guide: GuideId;
  mood: GuideMood;
  c: Look;
}) {
  return (
    <>
      {/* Harpreet's beard sits under the mouth and moustache. */}
      {guide === 'harpreet' && (
        <path
          d="M54 82 C54 120 76 134 100 134 C124 134 146 120 146 82 C140 102 128 110 116 110 C110 104 90 104 84 110 C72 110 60 102 54 82 Z"
          fill={c.hair}
        />
      )}
      <Brows mood={mood} color={c.hair} />
      <Eyes mood={mood} />
      <ellipse cx="100" cy="88" rx="5.5" ry="4.5" fill={c.shade} />
      {mood === 'happy' && (
        <>
          <ellipse cx="70" cy="94" rx="7" ry="4.5" fill={PINK} opacity="0.35" />
          <ellipse
            cx="130"
            cy="94"
            rx="7"
            ry="4.5"
            fill={PINK}
            opacity="0.35"
          />
        </>
      )}
      <Mouth mood={mood} />
      {guide === 'harpreet' && (
        <path
          d="M82 98 Q92 90 100 96 Q108 90 118 98 Q108 101 100 99 Q92 101 82 98 Z"
          fill={c.hair}
        />
      )}
      {guide === 'meera' && <circle cx="100" cy="61" r="3.2" fill="#E0245E" />}
      {guide === 'priya' && (
        // Jhumkas.
        <g fill="#F2B800">
          <path d="M47 94 Q52 86 57 94 Z" />
          <circle cx="52" cy="98" r="3" />
          <path d="M143 94 Q148 86 153 94 Z" />
          <circle cx="148" cy="98" r="3" />
        </g>
      )}
      {guide === 'arjun' && (
        <g fill="none" stroke={INK} strokeWidth={4}>
          <circle cx="84" cy="72" r="15" />
          <circle cx="116" cy="72" r="15" />
          <path d="M99 70 Q100 67 101 70" />
          <path d="M69 70 L56 66 M131 70 L144 66" />
        </g>
      )}
    </>
  );
}

function Brows({ mood, color }: { mood: GuideMood; color: string }) {
  const d = {
    idle: 'M75 56 Q84 52 93 56 M107 56 Q116 52 125 56',
    happy: 'M75 54 Q84 48 93 54 M107 54 Q116 48 125 54',
    thinking: 'M75 56 Q84 53 93 56 M107 52 Q116 46 125 50',
    oops: 'M76 56 L92 51 M108 51 L124 56',
  }[mood];
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
}

function Eyes({ mood }: { mood: GuideMood }) {
  if (mood === 'happy') {
    return (
      <path
        d="M75 76 Q84 64 93 76 M107 76 Q116 64 125 76"
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  }
  // Thinking looks up and to the side; oops goes wide with small pupils.
  const { ry, pupils, r } = {
    idle: { ry: 12, pupils: [86, 74, 118, 74], r: 6 },
    thinking: { ry: 12, pupils: [88, 67, 120, 67], r: 5.5 },
    oops: { ry: 13.5, pupils: [84, 73, 116, 73], r: 3.8 },
  }[mood];
  const [lx, ly, rx, ry2] = pupils;
  return (
    <>
      <ellipse cx="84" cy="72" rx="10" ry={ry} fill="#FFFFFF" />
      <ellipse cx="116" cy="72" rx="10" ry={ry} fill="#FFFFFF" />
      {[
        [lx, ly],
        [rx, ry2],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={INK} />
          <circle cx={x + 2} cy={y - 2.5} r="1.8" fill="#FFFFFF" />
        </g>
      ))}
    </>
  );
}

function Mouth({ mood }: { mood: GuideMood }) {
  if (mood === 'happy') {
    return (
      <>
        <path
          d="M84 97 L116 97 Q114 116 100 116 Q86 116 84 97 Z"
          fill={MOUTH}
        />
        <path d="M86 97 L114 97 L113 102 L87 102 Z" fill="#FFFFFF" />
        <path d="M92 110 Q100 104 108 110 Q100 116 92 110 Z" fill={PINK} />
      </>
    );
  }
  if (mood === 'thinking') {
    return (
      <path
        d="M93 104 Q102 100 111 102"
        fill="none"
        stroke={MOUTH}
        strokeWidth={4}
        strokeLinecap="round"
      />
    );
  }
  if (mood === 'oops') {
    return <ellipse cx="100" cy="104" rx="6.5" ry="8" fill={MOUTH} />;
  }
  return <path d="M88 99 Q100 112 112 99 Q100 105 88 99 Z" fill={MOUTH} />;
}

// Thought dots for thinking, a sweat drop for oops.
function Extras({ mood }: { mood: GuideMood }) {
  if (mood === 'thinking') {
    return (
      <>
        <circle cx="150" cy="44" r="5" fill={LEMON} />
        <circle cx="162" cy="30" r="7" fill={LEMON} />
        <circle cx="176" cy="14" r="9" fill={LEMON} />
      </>
    );
  }
  if (mood === 'oops') {
    return (
      <path
        d="M156 40 C162 50 164 56 158 60 C152 64 147 58 150 52 Z"
        fill="#7DA2FF"
      />
    );
  }
  return null;
}
