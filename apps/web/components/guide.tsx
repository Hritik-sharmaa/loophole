import type { AvatarFace } from '@loophole/shared';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { AvatarArt, bgHex, parseAvatar } from '@/components/avatar';
import { ReadAloud } from '@/components/read-aloud';

// The crew (ADR-028, redrawn in ADR-047): one guide per course. They are
// built from the same parts as learners' avatars (components/avatar.tsx),
// so guides and learners look like one world: doodle busts with thick ink
// outlines on a tinted circle. They teach the Learn cards, read out the
// task, voice the AI tutor and cheer when a lesson is done. The mood is a
// face plus a small extra: sparkles, thought dots or a sweat drop.

export type GuideMood = 'idle' | 'happy' | 'thinking' | 'oops';
export type GuideId = 'priya' | 'arjun' | 'meera' | 'harpreet';

type Look = {
  name: string;
  // What they say when a lesson is done.
  cheer: string;
  // Their reading-aloud voice, higher or lower (ADR-032).
  pitch: number;
  // Their avatar with the face left out (`*`); the mood fills it in.
  avatar: string;
  // The circle behind them, also used as their course's tint.
  tint: string;
};

const look = (
  name: string,
  cheer: string,
  pitch: number,
  avatar: string,
): Look => ({
  name,
  cheer,
  pitch,
  avatar,
  tint: bgHex(parseAvatar(avatar.replace('*', 'smile')).bg),
});

export const GUIDES: Record<GuideId, Look> = {
  priya: look(
    'Priya',
    'Shabaash!',
    1.1,
    's4.*.braid.black.kurta.sky.none.none.jhumkas.sky',
  ),
  arjun: look(
    'Arjun',
    'Badhiya!',
    1,
    's5.*.fluffy.black.hoodie.sun.round.none.none.sun',
  ),
  meera: look(
    'Meera',
    'Wah!',
    1.2,
    's3.*.bun.black.kurta.coral.none.flower.bindi.peach',
  ),
  harpreet: look(
    'Harpreet',
    'Balle balle!',
    0.85,
    's4.*.patka.auburn.hoodie.ink.none.none.beard.lilac',
  ),
};

// Each course has its guide; anything else (duels, login, errors, and
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

const FACE: Record<GuideMood, AvatarFace> = {
  idle: 'smile',
  happy: 'grin',
  thinking: 'dots',
  oops: 'wow',
};

const LINE = '#1D1A24';

// `full` leaves room above the head for the mood's extras and fits the
// tall boxes the crew used to stand in; `bust` is just the circle, for
// small spots like a speech bubble or the tutor panel.
const VIEW_BOX = { full: '0 0 200 280', bust: '0 0 200 200' };

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
  const clip = useId();
  const c = GUIDES[guide];
  const parts = parseAvatar(c.avatar.replace('*', FACE[mood]));
  // In `full`, the circle sits at the bottom of the box.
  const dy = crop === 'full' ? 80 : 0;
  return (
    <svg
      viewBox={VIEW_BOX[crop]}
      preserveAspectRatio="xMidYMax meet"
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx={100} cy={100} r={98} />
        </clipPath>
      </defs>
      <g transform={`translate(0 ${dy})`}>
        <circle cx={100} cy={100} r={98} fill={c.tint} />
        <g clipPath={`url(#${clip})`}>
          <AvatarArt parts={parts} />
        </g>
        <circle
          cx={100}
          cy={100}
          r={98}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={4}
        />
      </g>
      <MoodExtras mood={mood} top={dy} />
    </svg>
  );
}

// What the face alone can't say: sparkles for joy, thought dots, a drop.
function MoodExtras({ mood, top }: { mood: GuideMood; top: number }) {
  const spark = (x: number, y: number, s: number, fill: string) => (
    <path
      key={`${x}-${y}`}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -12C1 -5 5 -1 12 0C5 1 1 5 0 12C-1 5 -5 1 -12 0C-5 -1 -1 -5 0 -12Z"
      fill={fill}
    />
  );
  switch (mood) {
    case 'happy':
      return (
        <g>
          {spark(34, top + 20, 1.3, '#FFC21A')}
          {spark(170, top + 8, 1, '#6A4DF4')}
          {spark(176, top + 54, 0.7, '#FFC21A')}
        </g>
      );
    case 'thinking':
      return (
        <g fill="#6A4DF4">
          <circle cx={150} cy={top + 14} r={7} />
          <circle cx={170} cy={top + 2} r={9} opacity={top ? 1 : 0} />
          <circle cx={134} cy={top + 26} r={4.5} />
        </g>
      );
    case 'oops':
      return (
        <path
          d={`M158 ${top + 30}c6 8 8 12 8 16a8 8 0 0 1-16 0c0-4 2-8 8-16z`}
          fill="#8FC3FF"
          stroke={LINE}
          strokeWidth={3}
        />
      );
    default:
      return null;
  }
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
  const box = { sm: 'size-14', md: 'size-20', lg: 'size-28' }[size];
  return (
    <div aria-hidden className={`flex items-end -space-x-3 ${className}`}>
      {(Object.keys(GUIDES) as GuideId[]).map((id) => (
        <Guide
          key={id}
          guide={id}
          mood={mood}
          crop="bust"
          className={`${box} drop-shadow-[0_10px_14px_rgb(60_30_120/0.25)]`}
        />
      ))}
    </div>
  );
}

// A guide beside a speech bubble: how the crew talks to the learner.
// `speak` is the bubble's text as plain words; with it, a speaker button
// in the corner reads it aloud in the guide's voice (ADR-032).
export function GuideSays({
  guide,
  mood = 'idle',
  speak,
  children,
  className = '',
}: {
  guide: GuideId;
  mood?: GuideMood;
  speak?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <Guide
        guide={guide}
        mood={mood}
        className="h-24 w-[69px] shrink-0 drop-shadow-[0_10px_14px_rgb(60_30_120/0.25)] sm:h-28 sm:w-20"
      />
      <div className="relative mb-2 min-w-0 flex-1 rounded-card rounded-bl-md border border-border-muted bg-paper px-4 py-3 shadow-sticker-sm">
        <p className="mb-1 text-xs font-bold text-violet">
          {GUIDES[guide].name}
        </p>
        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1">{children}</div>
          {speak && <ReadAloud text={speak} pitch={GUIDES[guide].pitch} />}
        </div>
      </div>
    </div>
  );
}
