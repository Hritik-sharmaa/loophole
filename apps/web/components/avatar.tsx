import type { AvatarId } from '@loophole/shared';

// Learner avatars (ADR-044): twelve preset busts in the crew's flat style
// (components/guide.tsx): skin tones, hair, a patka, glasses, a bindi.
// The API stores only the id; this file draws it.

const INK = '#1B1433';

type Hair = 'short' | 'side' | 'long' | 'bun' | 'curly' | 'patka' | 'buzz';
type Extra = 'bindi' | 'glasses' | 'moustache' | 'beard' | 'earrings';

type Look = {
  skin: string;
  hair: Hair;
  hairColor: string;
  // A patka's cloth.
  patka?: string;
  top: string;
  tint: string;
  extras: Extra[];
  // What a screen reader says in the picker.
  label: string;
};

export const AVATARS: Record<AvatarId, Look> = {
  a1: {
    skin: '#B5784A',
    hair: 'long',
    hairColor: '#1F1414',
    top: '#3776AB',
    tint: '#D6E4F5',
    extras: ['bindi', 'earrings'],
    label: 'Long hair, bindi and earrings',
  },
  a2: {
    skin: '#8D5524',
    hair: 'short',
    hairColor: '#1B1433',
    top: '#F7DF1E',
    tint: '#FFF1A8',
    extras: ['glasses'],
    label: 'Short hair and glasses',
  },
  a3: {
    skin: '#C68B5E',
    hair: 'bun',
    hairColor: '#2B1B17',
    top: '#F25C8C',
    tint: '#FBD9E5',
    extras: ['bindi'],
    label: 'Hair in a bun and a bindi',
  },
  a4: {
    skin: '#7A4A2A',
    hair: 'patka',
    hairColor: '#1F1414',
    patka: '#E8590C',
    top: '#3DAE6B',
    tint: '#D8F3E3',
    extras: ['beard'],
    label: 'Orange patka and a beard',
  },
  a5: {
    skin: '#D9A27A',
    hair: 'side',
    hairColor: '#3E2A26',
    top: '#7A5CE0',
    tint: '#E4DEFA',
    extras: [],
    label: 'Side-parted hair',
  },
  a6: {
    skin: '#9A6440',
    hair: 'curly',
    hairColor: '#1F1414',
    top: '#FF8A3D',
    tint: '#FFD9CC',
    extras: ['earrings'],
    label: 'Curly hair and earrings',
  },
  a7: {
    skin: '#B5784A',
    hair: 'buzz',
    hairColor: '#1B1433',
    top: '#2F4AD0',
    tint: '#D6E4F5',
    extras: ['moustache'],
    label: 'Very short hair and a moustache',
  },
  a8: {
    skin: '#E0B08A',
    hair: 'long',
    hairColor: '#3E2A26',
    top: '#3DAE6B',
    tint: '#D8F3E3',
    extras: ['glasses'],
    label: 'Long brown hair and glasses',
  },
  a9: {
    skin: '#8D5524',
    hair: 'bun',
    hairColor: '#1B1433',
    top: '#F7DF1E',
    tint: '#FFF1A8',
    extras: ['bindi', 'earrings'],
    label: 'Bun, bindi and earrings',
  },
  a10: {
    skin: '#C68B5E',
    hair: 'side',
    hairColor: '#1F1414',
    top: '#F25C8C',
    tint: '#FBD9E5',
    extras: ['glasses', 'moustache'],
    label: 'Side-parted hair, glasses and a moustache',
  },
  a11: {
    skin: '#9A6440',
    hair: 'patka',
    hairColor: '#1F1414',
    patka: '#2F4AD0',
    top: '#FF8A3D',
    tint: '#FFD9CC',
    extras: ['beard'],
    label: 'Blue patka and a beard',
  },
  a12: {
    skin: '#D9A27A',
    hair: 'curly',
    hairColor: '#3E2A26',
    top: '#7A5CE0',
    tint: '#E4DEFA',
    extras: ['glasses'],
    label: 'Curly brown hair and glasses',
  },
};

export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[];

// A round avatar on its tint. Decoration next to a name unless `label` is
// given.
export function Avatar({
  id,
  className = 'size-9',
  label,
}: {
  id: AvatarId;
  className?: string;
  label?: string;
}) {
  const a = AVATARS[id] ?? AVATARS.a1;
  return (
    <svg
      viewBox="0 0 100 100"
      className={`shrink-0 rounded-full border-2 border-ink ${className}`}
      style={{ backgroundColor: a.tint }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {a.hair === 'long' && (
        <rect x="25" y="24" width="50" height="54" rx="20" fill={a.hairColor} />
      )}
      {/* Shoulders and neck. */}
      <path d="M14 100 C14 80 30 72 50 72 C70 72 86 80 86 100 Z" fill={a.top} />
      <rect x="43" y="60" width="14" height="14" rx="5" fill={a.skin} />
      {/* Ears and head. */}
      <circle cx="30" cy="47" r="5" fill={a.skin} />
      <circle cx="70" cy="47" r="5" fill={a.skin} />
      <rect x="30" y="22" width="40" height="44" rx="18" fill={a.skin} />
      {a.extras.includes('beard') && (
        <path
          d="M31 48 C32 64 42 70 50 70 C58 70 68 64 69 48 C64 58 57 61 50 61 C43 61 36 58 31 48 Z"
          fill={a.hairColor}
        />
      )}
      {/* Face. */}
      <circle cx="42" cy="46" r="2.8" fill={INK} />
      <circle cx="58" cy="46" r="2.8" fill={INK} />
      <path
        d="M43 55 Q50 61 57 55"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {a.extras.includes('moustache') && (
        <path d="M42 53 Q50 48 58 53 Q50 55.5 42 53 Z" fill={a.hairColor} />
      )}
      {a.extras.includes('bindi') && (
        <circle cx="50" cy="38" r="2" fill="#D7263D" />
      )}
      {a.extras.includes('glasses') && (
        <g stroke={INK} strokeWidth="2" fill="none">
          <circle cx="42" cy="46" r="6.5" />
          <circle cx="58" cy="46" r="6.5" />
          <path d="M48.5 46 L51.5 46" />
        </g>
      )}
      {a.extras.includes('earrings') && (
        <g fill="#FFD84D">
          <circle cx="30" cy="54" r="2.4" />
          <circle cx="70" cy="54" r="2.4" />
        </g>
      )}
      <HairTop look={a} />
    </svg>
  );
}

function HairTop({ look: a }: { look: Look }) {
  switch (a.hair) {
    case 'patka':
      return (
        <g>
          <path
            d="M27 41 C27 17 40 11 50 11 C60 11 73 17 73 41 C66 34 58 31 50 31 C42 31 34 34 27 41 Z"
            fill={a.patka}
          />
          <circle cx="50" cy="19" r="5" fill={INK} opacity="0.18" />
        </g>
      );
    case 'curly':
      return (
        <g fill={a.hairColor}>
          {[
            [33, 31],
            [41, 23],
            [50, 20],
            [59, 23],
            [67, 31],
          ].map(([cx, cy]) => (
            <circle key={cx} cx={cx} cy={cy} r="9" />
          ))}
        </g>
      );
    case 'buzz':
      return (
        <path
          d="M30 36 C31 24 40 19 50 19 C60 19 69 24 70 36 C62 30 38 30 30 36 Z"
          fill={a.hairColor}
        />
      );
    case 'side':
      return (
        <path
          d="M29 42 C28 22 42 15 52 16 C64 17 72 26 71 42 C64 30 52 26 40 34 Z"
          fill={a.hairColor}
        />
      );
    case 'bun':
      return (
        <g fill={a.hairColor}>
          <circle cx="50" cy="13" r="8" />
          <path d="M29 40 C29 22 40 16 50 16 C60 16 71 22 71 40 C66 32 58 28 50 28 C42 28 34 32 29 40 Z" />
        </g>
      );
    default:
      // short and long share the top.
      return (
        <path
          d="M29 40 C29 22 40 16 50 16 C60 16 71 22 71 40 C66 32 58 28 50 28 C42 28 34 32 29 40 Z"
          fill={a.hairColor}
        />
      );
  }
}

// The picker on the profile: all twelve, the chosen one ringed.
export function AvatarPicker({
  value,
  onPick,
  disabled = false,
}: {
  value: AvatarId;
  onPick: (id: AvatarId) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6" aria-label="Avatar">
      {AVATAR_IDS.map((id) => {
        const chosen = id === value;
        return (
          <li key={id} className="flex justify-center">
            <button
              type="button"
              onClick={() => onPick(id)}
              disabled={disabled}
              aria-pressed={chosen}
              aria-label={AVATARS[id].label}
              className={`rounded-full p-1 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${chosen ? 'bg-orange' : 'hover:-translate-y-0.5'}`}
            >
              <Avatar id={id} className="size-14" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
