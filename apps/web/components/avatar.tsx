import type {
  AvatarBg,
  AvatarCode,
  AvatarDetail,
  AvatarFace,
  AvatarGlasses,
  AvatarHair,
  AvatarHairColor,
  AvatarItem,
  AvatarParts,
  AvatarSkin,
  AvatarTop,
  AvatarTopColor,
} from '@loophole/shared';
import type { ReactNode } from 'react';

// Learner avatars (ADR-046): a doodle bust built from parts in the avatar
// maker (app/profile/avatar). Thick ink outlines, flat fills, dot eyes.
// Every part is drawn here on one 200 × 200 box; the API only checks the
// part ids (apps/api/src/common/avatars.ts keeps the same lists).

const LINE = '#1D1A24';
const W = 5;

type Choice<T extends string> = { id: T; label: string };
type Swatch<T extends string> = Choice<T> & { hex: string };

export const SKINS: Swatch<AvatarSkin>[] = [
  { id: 's1', label: 'Fair', hex: '#F7D5C0' },
  { id: 's2', label: 'Light', hex: '#EDBC99' },
  { id: 's3', label: 'Wheat', hex: '#D9A27B' },
  { id: 's4', label: 'Tan', hex: '#BE845B' },
  { id: 's5', label: 'Brown', hex: '#9A6342' },
  { id: 's6', label: 'Deep', hex: '#6F452E' },
];

export const FACES: Choice<AvatarFace>[] = [
  { id: 'dots', label: 'Calm' },
  { id: 'smile', label: 'Smile' },
  { id: 'grin', label: 'Big grin' },
  { id: 'wink', label: 'Wink' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'wow', label: 'Surprised' },
];

export const HAIRS: Choice<AvatarHair>[] = [
  { id: 'fluffy', label: 'Fluffy curls' },
  { id: 'short', label: 'Short' },
  { id: 'side', label: 'Side swoop' },
  { id: 'buzz', label: 'Buzz cut' },
  { id: 'long', label: 'Long' },
  { id: 'bob', label: 'Bob with bangs' },
  { id: 'bun', label: 'Top bun' },
  { id: 'braid', label: 'Braid' },
  { id: 'patka', label: 'Patka' },
  { id: 'none', label: 'No hair' },
];

export const HAIR_COLORS: Swatch<AvatarHairColor>[] = [
  { id: 'black', label: 'Black', hex: '#24202B' },
  { id: 'darkbrown', label: 'Dark brown', hex: '#4A3127' },
  { id: 'brown', label: 'Brown', hex: '#7A4F33' },
  { id: 'auburn', label: 'Auburn', hex: '#A4502A' },
  { id: 'grey', label: 'Grey', hex: '#B4B1BA' },
  { id: 'violet', label: 'Violet', hex: '#7C52E6' },
  { id: 'blue', label: 'Blue', hex: '#3F7EEA' },
  { id: 'pink', label: 'Pink', hex: '#F27DB0' },
];

export const TOPS: Choice<AvatarTop>[] = [
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'tee', label: 'T-shirt' },
  { id: 'kurta', label: 'Kurta' },
  { id: 'collar', label: 'Collared shirt' },
  { id: 'sweater', label: 'Sweater' },
];

export const TOP_COLORS: Swatch<AvatarTopColor>[] = [
  { id: 'violet', label: 'Violet', hex: '#7440E0' },
  { id: 'sun', label: 'Sunflower', hex: '#FFC21A' },
  { id: 'coral', label: 'Coral', hex: '#FF6F61' },
  { id: 'sky', label: 'Sky', hex: '#5AA6F0' },
  { id: 'teal', label: 'Teal', hex: '#2BAE9C' },
  { id: 'ink', label: 'Black', hex: '#2E2A38' },
  { id: 'white', label: 'White', hex: '#FAF9F7' },
];

export const GLASSES: Choice<AvatarGlasses>[] = [
  { id: 'none', label: 'No glasses' },
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'shades', label: 'Sunglasses' },
];

export const ITEMS: Choice<AvatarItem>[] = [
  { id: 'none', label: 'Nothing' },
  { id: 'cat', label: 'Cat on your head' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'cap', label: 'Cap' },
  { id: 'flower', label: 'Flower' },
  { id: 'crown', label: 'Crown' },
  { id: 'sprout', label: 'Sprout' },
];

export const DETAILS: Choice<AvatarDetail>[] = [
  { id: 'none', label: 'Nothing' },
  { id: 'bindi', label: 'Bindi' },
  { id: 'jhumkas', label: 'Jhumkas' },
  { id: 'beard', label: 'Beard' },
  { id: 'moustache', label: 'Moustache' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'blush', label: 'Blush' },
];

export const BGS: Swatch<AvatarBg>[] = [
  { id: 'lilac', label: 'Lilac', hex: '#E9E1FF' },
  { id: 'sun', label: 'Butter', hex: '#FFEFC0' },
  { id: 'peach', label: 'Peach', hex: '#FFDFD2' },
  { id: 'sky', label: 'Sky', hex: '#D9E9FF' },
  { id: 'mint', label: 'Mint', hex: '#D5F2E9' },
  { id: 'paper', label: 'White', hex: '#FFFFFF' },
  { id: 'grey', label: 'Fog', hex: '#ECEBEF' },
];

const CHOICES: { [K in keyof AvatarParts]: Choice<AvatarParts[K]>[] } = {
  skin: SKINS,
  face: FACES,
  hair: HAIRS,
  hairColor: HAIR_COLORS,
  top: TOPS,
  topColor: TOP_COLORS,
  glasses: GLASSES,
  item: ITEMS,
  detail: DETAILS,
  bg: BGS,
};

// Same order as the API (common/avatars.ts).
const ORDER: (keyof AvatarParts)[] = [
  'skin',
  'face',
  'hair',
  'hairColor',
  'top',
  'topColor',
  'glasses',
  'item',
  'detail',
  'bg',
];

export const DEFAULT_AVATAR: AvatarParts = {
  skin: 's3',
  face: 'dots',
  hair: 'fluffy',
  hairColor: 'black',
  top: 'hoodie',
  topColor: 'violet',
  glasses: 'none',
  item: 'none',
  detail: 'none',
  bg: 'lilac',
};

export function encodeAvatar(parts: AvatarParts): AvatarCode {
  return ORDER.map((part) => parts[part]).join('.');
}

// The API only ever sends valid codes; anything else (an old client, a
// typo in a mock) draws the default rather than breaking the page.
export function parseAvatar(code: AvatarCode): AvatarParts {
  const ids = code.split('.');
  if (ids.length !== ORDER.length) return DEFAULT_AVATAR;
  const parts = {} as Record<keyof AvatarParts, string>;
  for (const [i, part] of ORDER.entries()) {
    if (!CHOICES[part].some((c) => c.id === ids[i])) return DEFAULT_AVATAR;
    parts[part] = ids[i];
  }
  return parts as AvatarParts;
}

// Every part picked at random, for the maker's Shuffle button.
export function randomAvatar(): AvatarParts {
  const parts = {} as Record<keyof AvatarParts, string>;
  for (const part of ORDER) {
    const list = CHOICES[part];
    parts[part] = list[Math.floor(Math.random() * list.length)].id;
  }
  return parts as AvatarParts;
}

const hexOf = <T extends string>(list: Swatch<T>[], id: T) =>
  (list.find((s) => s.id === id) ?? list[0]).hex;

// ---------------------------------------------------------------------------
// Drawing. Layers go back to front: back hair, neck, top, braid, head,
// beard, face, details, front hair, glasses, item.

const outline = { stroke: LINE, strokeWidth: W } as const;

const HEAD =
  'M100 50 C125 50 139 67 139 91 C139 117 122 134 100 134 C78 134 61 117 61 91 C61 67 75 50 100 50 Z';

// Shoulders with a neck opening, shared by every top.
const BODY =
  'M28 204 C30 167 54 151 84 147 C89 158 111 158 116 147 C146 151 170 167 172 204 Z';

function BackHair({ hair, color }: { hair: AvatarHair; color: string }) {
  switch (hair) {
    case 'long':
      return (
        <path
          d="M56 94 C52 58 76 40 100 40 C124 40 148 58 144 94 L148 158 C148 168 134 170 126 162 L74 162 C66 170 52 168 52 158 Z"
          fill={color}
          {...outline}
        />
      );
    case 'bob':
      return (
        <path
          d="M54 96 C50 60 76 40 100 40 C124 40 150 60 146 96 L148 126 C148 135 138 137 133 131 L67 131 C62 137 52 135 52 126 Z"
          fill={color}
          {...outline}
        />
      );
    case 'bun':
      return <circle cx={100} cy={33} r={16} fill={color} {...outline} />;
    default:
      return null;
  }
}

function FrontHair({ hair, color }: { hair: AvatarHair; color: string }) {
  const swirl = { fill: 'none', stroke: LINE, strokeWidth: W * 0.6 } as const;
  switch (hair) {
    case 'fluffy':
      return (
        <g>
          <path
            d="M56 106 C44 102 42 86 51 79 C43 67 51 51 65 50 C65 36 83 27 96 35 C104 23 126 25 130 39 C144 37 157 51 151 64 C163 72 159 92 147 97 C151 105 147 111 142 111 C142 97 138 85 130 77 C122 85 108 85 100 77 C92 85 77 85 70 77 C64 85 60 95 56 106 Z"
            fill={color}
            {...outline}
          />
          <path d="M80 52 q7 -7 14 0" {...swirl} />
          <path d="M112 50 q7 -7 14 0" {...swirl} />
          <path d="M58 72 q5 -6 11 -2" {...swirl} />
        </g>
      );
    case 'short':
      return (
        <path
          d="M58 96 C54 62 74 42 100 42 C126 42 146 62 142 96 C138 82 132 74 124 69 C110 78 88 78 76 69 C68 75 62 84 58 96 Z"
          fill={color}
          {...outline}
        />
      );
    case 'side':
      return (
        <path
          d="M58 98 C52 60 76 40 104 42 C130 44 148 64 142 98 C138 84 132 76 124 72 C110 74 92 70 80 58 C74 70 64 80 58 98 Z"
          fill={color}
          {...outline}
        />
      );
    case 'buzz':
      return (
        <path
          d="M62 86 C62 62 79 49 100 49 C121 49 138 62 138 86 C127 73 73 73 62 86 Z"
          fill={color}
          {...outline}
        />
      );
    case 'long':
    case 'braid':
      return (
        <g>
          <path
            d="M58 98 C54 62 76 42 100 42 C124 42 146 62 142 98 C136 80 120 66 100 64 C80 66 64 80 58 98 Z"
            fill={color}
            {...outline}
          />
          <path d="M100 45 V63" {...swirl} />
        </g>
      );
    case 'bob':
      return (
        <path
          d="M58 96 C55 62 76 42 100 42 C124 42 145 62 142 96 L140 80 C122 73 78 73 60 80 Z"
          fill={color}
          {...outline}
        />
      );
    case 'bun':
      return (
        <path
          d="M59 94 C56 62 76 46 100 46 C124 46 144 62 141 94 C136 80 122 70 100 69 C78 70 64 80 59 94 Z"
          fill={color}
          {...outline}
        />
      );
    case 'patka':
      return (
        <g>
          <path
            d="M58 97 C52 58 74 34 100 34 C126 34 148 58 142 97 C132 84 118 77 100 77 C82 77 68 84 58 97 Z"
            fill={color}
            {...outline}
          />
          <path
            d="M64 82 C76 62 96 50 122 46 M70 92 C84 74 104 62 136 62"
            fill="none"
            stroke={LINE}
            strokeWidth={W * 0.55}
            opacity={0.4}
          />
          <path
            d="M86 44 C86 30 114 30 114 44 C114 52 106 55 100 55 C94 55 86 52 86 44 Z"
            fill={color}
            {...outline}
          />
          <path
            d="M94 40 q6 -5 12 0"
            fill="none"
            stroke={LINE}
            strokeWidth={W * 0.55}
            opacity={0.45}
          />
        </g>
      );
    default:
      return (
        <path
          d="M78 66 q8 -8 18 -8"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={W * 0.9}
          opacity={0.5}
        />
      );
  }
}

// The braid falls over the right shoulder, in front of the top.
function Braid({ color }: { color: string }) {
  return (
    <g fill={color} {...outline}>
      <ellipse cx={133} cy={116} rx={11} ry={12} />
      <ellipse cx={137} cy={133} rx={10.5} ry={11} />
      <ellipse cx={140} cy={149} rx={9.5} ry={10} />
      <ellipse cx={142} cy={164} rx={8.5} ry={9} />
      <path d="M138 175 L142 186 L146 175 Z" />
      <rect x={136} y={171} width={12} height={6} rx={3} fill="#FFC21A" />
    </g>
  );
}

function Top({ top, color }: { top: AvatarTop; color: string }) {
  const thin = { fill: 'none', stroke: LINE, strokeWidth: W * 0.8 } as const;
  const sleeves = (
    <path
      d="M58 204 C58 188 62 177 68 169 M142 204 C142 188 138 177 132 169"
      {...thin}
    />
  );
  const button = (cy: number) => (
    <circle key={cy} cx={100} cy={cy} r={2.6} fill={LINE} />
  );
  switch (top) {
    case 'hoodie':
      return (
        <g>
          <path d={BODY} fill={color} {...outline} />
          {sleeves}
          <path
            d="M92 157 L90 182 M108 157 L110 182"
            fill="none"
            stroke={LINE}
            strokeWidth={W * 0.7}
          />
          <circle cx={90} cy={184} r={3} fill={LINE} />
          <circle cx={110} cy={184} r={3} fill={LINE} />
        </g>
      );
    case 'kurta':
      return (
        <g>
          <path d={BODY} fill={color} {...outline} />
          {sleeves}
          <path
            d="M81 153 C88 168 112 168 119 153"
            fill="none"
            stroke="#FFD34F"
            strokeWidth={4}
            strokeDasharray="0.1 7"
            strokeLinecap="round"
          />
          <path d="M100 157 V190" {...thin} />
          {[172, 182].map(button)}
        </g>
      );
    case 'collar':
      return (
        <g>
          <path d={BODY} fill={color} {...outline} />
          {sleeves}
          <path d="M100 160 V204" {...thin} />
          <path
            d="M83 145 L100 161 L88 170 L77 151 Z M117 145 L100 161 L112 170 L123 151 Z"
            fill={color}
            {...outline}
          />
          {[176, 190].map(button)}
        </g>
      );
    case 'sweater': {
      const neck = 'M82 146 C87 163 113 163 118 146';
      return (
        <g>
          <path d={BODY} fill={color} {...outline} />
          {sleeves}
          <path d={neck} fill="none" stroke={LINE} strokeWidth={W + 8} />
          <path d={neck} fill="none" stroke={color} strokeWidth={8} />
          <path
            d="M92 158 l0 5 M100 160 l0 5 M108 158 l0 5"
            stroke={LINE}
            strokeWidth={W * 0.4}
            opacity={0.5}
          />
        </g>
      );
    }
    default:
      return (
        <g>
          <path d={BODY} fill={color} {...outline} />
          {sleeves}
        </g>
      );
  }
}

// Behind the neck: the hoodie's hood.
function Hood({ color }: { color: string }) {
  return (
    <path
      d="M62 162 C58 138 78 124 100 128 C122 124 142 138 138 162 Z"
      fill={color}
      {...outline}
    />
  );
}

function Face({ face }: { face: AvatarFace }) {
  const line = { fill: 'none', stroke: LINE, strokeWidth: W * 0.8 } as const;
  const dot = (cx: number) => (
    <circle key={cx} cx={cx} cy={95} r={4.6} fill={LINE} />
  );
  const smile = <path d="M91 116 Q100 123 109 116" {...line} />;
  const nose = (
    <path
      d="M101 101 C104 106 103 109 99 110"
      fill="none"
      stroke={LINE}
      strokeWidth={W * 0.65}
    />
  );
  let eyes: ReactNode = [dot(86), dot(114)];
  let mouth: ReactNode = null;
  switch (face) {
    case 'smile':
      mouth = smile;
      break;
    case 'grin':
      mouth = (
        <g>
          <path
            d="M89 113 H111 C111 122 106 127 100 127 C94 127 89 122 89 113 Z"
            fill={LINE}
          />
          <path
            d="M94 122.5 C97 120 103 120 106 122.5 C104 125.5 96 125.5 94 122.5 Z"
            fill="#FF7A8A"
          />
        </g>
      );
      break;
    case 'wink':
      eyes = [dot(86), <path key="w" d="M108 97 Q114 90 120 97" {...line} />];
      mouth = smile;
      break;
    case 'sleepy':
      eyes = (
        <path d="M80 94 Q86 100 92 94 M108 94 Q114 100 120 94" {...line} />
      );
      mouth = <path d="M96 117 H104" {...line} />;
      break;
    case 'wow':
      eyes = [86, 114].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={95} r={5.8} fill={LINE} />
          <circle cx={cx + 1.8} cy={93} r={1.7} fill="#FFFFFF" />
        </g>
      ));
      mouth = <ellipse cx={100} cy={119} rx={4} ry={5} fill={LINE} />;
      break;
  }
  return (
    <g>
      {eyes}
      {nose}
      {mouth}
    </g>
  );
}

function Beard({ color, skin }: { color: string; skin: string }) {
  return (
    <g>
      <path
        d="M61 96 C61 126 80 141 100 141 C120 141 139 126 139 96 C133 111 124 117 116 115 C110 109 90 109 84 115 C76 117 67 111 61 96 Z"
        fill={color}
        {...outline}
      />
      {/* A gap in the beard so the mouth still shows. */}
      <ellipse cx={100} cy={118} rx={10} ry={4.5} fill={skin} />
    </g>
  );
}

function Detail({
  detail,
  hairColor,
}: {
  detail: AvatarDetail;
  hairColor: string;
}) {
  switch (detail) {
    case 'bindi':
      return <circle cx={100} cy={83} r={3.4} fill="#E2334A" />;
    case 'jhumkas':
      return (
        <g {...outline} strokeWidth={W * 0.55}>
          {[61, 139].map((cx) => (
            <g key={cx}>
              <path d={`M${cx - 5} 112 a5 5 0 0 1 10 0 Z`} fill="#FFC21A" />
              <circle cx={cx} cy={116} r={2.2} fill="#FFC21A" />
            </g>
          ))}
        </g>
      );
    case 'moustache':
      return (
        <path
          d="M87 111 C92 105 98 106 100 109 C102 106 108 105 113 111 C107 113.5 102 112.5 100 111 C98 112.5 93 113.5 87 111 Z"
          fill={hairColor}
          stroke={LINE}
          strokeWidth={W * 0.5}
        />
      );
    case 'freckles':
      return (
        <g fill="#A8603D" opacity={0.7}>
          {[
            [79, 104],
            [85, 107],
            [76, 109],
            [121, 104],
            [115, 107],
            [124, 109],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.7} />
          ))}
        </g>
      );
    case 'blush':
      return (
        <g fill="#FF8A8A" opacity={0.45}>
          <ellipse cx={77} cy={107} rx={7.5} ry={4.2} />
          <ellipse cx={123} cy={107} rx={7.5} ry={4.2} />
        </g>
      );
    default:
      return null;
  }
}

function Glasses({ glasses }: { glasses: AvatarGlasses }) {
  const frame = { fill: 'none', stroke: LINE, strokeWidth: W * 0.8 } as const;
  const arms = <path d="M73 92 L62 89 M127 92 L138 89" {...frame} />;
  switch (glasses) {
    case 'round':
      return (
        <g>
          <circle
            cx={86}
            cy={95}
            r={11.5}
            {...frame}
            fill="#FFFFFF"
            fillOpacity={0.3}
          />
          <circle
            cx={114}
            cy={95}
            r={11.5}
            {...frame}
            fill="#FFFFFF"
            fillOpacity={0.3}
          />
          <path d="M97.5 94 Q100 91 102.5 94" {...frame} />
          {arms}
        </g>
      );
    case 'square':
      return (
        <g>
          <rect
            x={73}
            y={85}
            width={25}
            height={20}
            rx={5}
            {...frame}
            fill="#FFFFFF"
            fillOpacity={0.3}
          />
          <rect
            x={102}
            y={85}
            width={25}
            height={20}
            rx={5}
            {...frame}
            fill="#FFFFFF"
            fillOpacity={0.3}
          />
          <path d="M98 93 H102" {...frame} />
          {arms}
        </g>
      );
    case 'shades':
      return (
        <g>
          <path
            d="M72 87 H98 V95 C98 103 92 108 85 108 C78 108 72 103 72 95 Z M102 87 H128 V95 C128 103 122 108 115 108 C108 108 102 103 102 95 Z"
            {...frame}
            fill={LINE}
          />
          <path
            d="M77 92 L84 92 M107 92 L114 92"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            opacity={0.6}
          />
          <path d="M98 90 H102" {...frame} />
          {arms}
        </g>
      );
    default:
      return null;
  }
}

function Item({ item }: { item: AvatarItem }) {
  switch (item) {
    case 'cat': {
      const fur = '#8F8A97';
      const tail = 'M146 46 C162 42 166 26 157 17';
      return (
        <g>
          <path d={tail} fill="none" stroke={LINE} strokeWidth={13} />
          <path d={tail} fill="none" stroke={fur} strokeWidth={4} />
          <path
            d="M72 48 C70 32 92 25 116 26 C139 27 151 36 149 47 C148 54 74 56 72 48 Z"
            fill={fur}
            {...outline}
          />
          <path
            d="M106 28 q3 6 0 11 M118 28 q3 6 0 11 M130 30 q3 6 0 11"
            fill="none"
            stroke="#625D6B"
            strokeWidth={3}
          />
          <path
            d="M61 30 L58 13 L73 23 Z M80 22 L88 10 L90 27 Z"
            fill={fur}
            {...outline}
          />
          <circle cx={75} cy={37} r={15} fill={fur} {...outline} />
          <ellipse cx={75} cy={43} rx={9.5} ry={7} fill="#FFFFFF" />
          <path
            d="M66 36 q3 3 6 0 M78 36 q3 3 6 0"
            fill="none"
            stroke={LINE}
            strokeWidth={2.6}
          />
          <path
            d="M73.5 41 h3 l-1.5 2 Z"
            fill="#F27D9A"
            stroke="#F27D9A"
            strokeWidth={1.5}
          />
          <ellipse
            cx={96}
            cy={52}
            rx={7}
            ry={4}
            fill="#FFFFFF"
            {...outline}
            strokeWidth={W * 0.6}
          />
        </g>
      );
    }
    case 'headphones':
      return (
        <g>
          <path
            d="M57 96 C54 36 146 36 143 96"
            fill="none"
            stroke={LINE}
            strokeWidth={11}
          />
          <path
            d="M57 96 C54 36 146 36 143 96"
            fill="none"
            stroke="#3A3645"
            strokeWidth={4}
          />
          <rect
            x={45}
            y={80}
            width={20}
            height={32}
            rx={9}
            fill="#FF6F61"
            {...outline}
          />
          <rect
            x={135}
            y={80}
            width={20}
            height={32}
            rx={9}
            fill="#FF6F61"
            {...outline}
          />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path
            d="M60 78 C60 48 78 33 100 33 C122 33 140 48 140 78 Z"
            fill="#FFC21A"
            {...outline}
          />
          <path
            d="M100 36 V76"
            fill="none"
            stroke={LINE}
            strokeWidth={W * 0.5}
            opacity={0.5}
          />
          <path
            d="M58 78 C88 69 140 69 167 81 C152 92 92 90 58 85 Z"
            fill="#EFA400"
            {...outline}
          />
          <circle
            cx={100}
            cy={33}
            r={4}
            fill="#EFA400"
            {...outline}
            strokeWidth={W * 0.6}
          />
        </g>
      );
    case 'flower':
      return (
        <g {...outline} strokeWidth={W * 0.7}>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <circle
              key={deg}
              cx={132 + 9 * Math.cos((deg * Math.PI) / 180)}
              cy={58 + 9 * Math.sin((deg * Math.PI) / 180)}
              r={7.5}
              fill="#FFFFFF"
            />
          ))}
          <circle cx={132} cy={58} r={6.5} fill="#FFC21A" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M77 50 L73 22 L88 34 L100 15 L112 34 L127 22 L123 50 Z"
            fill="#FFC21A"
            {...outline}
          />
          <circle cx={100} cy={40} r={4} fill="#FF6F61" />
          <circle cx={86} cy={43} r={2.8} fill="#5AA6F0" />
          <circle cx={114} cy={43} r={2.8} fill="#5AA6F0" />
        </g>
      );
    case 'sprout':
      return (
        <g>
          <path
            d="M100 46 C100 38 101 31 100 22"
            fill="none"
            stroke={LINE}
            strokeWidth={W}
          />
          <path
            d="M100 30 C90 31 81 25 81 16 C91 15 99 21 100 30 Z M100 26 C107 17 118 14 123 19 C119 29 108 31 100 26 Z"
            fill="#6CCB8F"
            {...outline}
            strokeWidth={W * 0.7}
          />
        </g>
      );
    default:
      return null;
  }
}

// The bust, no background: for the avatar circle and the maker's tiles.
export function AvatarArt({ parts }: { parts: AvatarParts }) {
  const skin = hexOf(SKINS, parts.skin);
  const hair = hexOf(HAIR_COLORS, parts.hairColor);
  // A patka takes the hair colour as its cloth, so facial hair under it
  // stays black rather than turning blue or pink with the cloth.
  const facialHair =
    parts.hair === 'patka' ? hexOf(HAIR_COLORS, 'black') : hair;
  const top = hexOf(TOP_COLORS, parts.topColor);
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <BackHair hair={parts.hair} color={hair} />
      {parts.top === 'hoodie' && <Hood color={top} />}
      <path d="M88 118 V162 H112 V118 Z" fill={skin} {...outline} />
      <Top top={parts.top} color={top} />
      {parts.hair === 'braid' && <Braid color={hair} />}
      <circle cx={61} cy={96} r={9} fill={skin} {...outline} />
      <circle cx={139} cy={96} r={9} fill={skin} {...outline} />
      <path d={HEAD} fill={skin} {...outline} />
      {parts.detail === 'beard' && <Beard color={facialHair} skin={skin} />}
      <Face face={parts.face} />
      {parts.detail !== 'beard' && (
        <Detail detail={parts.detail} hairColor={facialHair} />
      )}
      <FrontHair hair={parts.hair} color={hair} />
      <Glasses glasses={parts.glasses} />
      <Item item={parts.item} />
    </g>
  );
}

export const bgHex = (bg: AvatarBg) => hexOf(BGS, bg);

// A round avatar on its background colour. Decoration next to a name
// unless `label` is given.
export function Avatar({
  code,
  className = 'size-9',
  label,
}: {
  code: AvatarCode;
  className?: string;
  label?: string;
}) {
  const parts = parseAvatar(code);
  return (
    <svg
      viewBox="0 0 200 200"
      className={`shrink-0 rounded-full border border-border-muted ${className}`}
      style={{ backgroundColor: bgHex(parts.bg) }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <AvatarArt parts={parts} />
    </svg>
  );
}
