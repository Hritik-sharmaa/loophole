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

// Learner avatars (ADR-046): built from parts in the avatar maker and
// drawn by the web app (components/avatar.tsx). The API only checks that
// every part exists and stores the code.

// A Record keeps each list complete: adding a part to the shared type
// fails the build here until it is listed.
function all<T extends string>(parts: Record<T, true>): readonly T[] {
  return Object.keys(parts) as T[];
}

export const AVATAR_PARTS: {
  [K in keyof AvatarParts]: readonly AvatarParts[K][];
} = {
  skin: all<AvatarSkin>({
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    s5: true,
    s6: true,
  }),
  face: all<AvatarFace>({
    dots: true,
    smile: true,
    grin: true,
    wink: true,
    sleepy: true,
    wow: true,
  }),
  hair: all<AvatarHair>({
    fluffy: true,
    short: true,
    side: true,
    buzz: true,
    long: true,
    bob: true,
    bun: true,
    braid: true,
    patka: true,
    none: true,
  }),
  hairColor: all<AvatarHairColor>({
    black: true,
    darkbrown: true,
    brown: true,
    auburn: true,
    grey: true,
    violet: true,
    blue: true,
    pink: true,
  }),
  top: all<AvatarTop>({
    hoodie: true,
    tee: true,
    kurta: true,
    collar: true,
    sweater: true,
  }),
  topColor: all<AvatarTopColor>({
    violet: true,
    sun: true,
    coral: true,
    sky: true,
    teal: true,
    ink: true,
    white: true,
  }),
  glasses: all<AvatarGlasses>({
    none: true,
    round: true,
    square: true,
    shades: true,
  }),
  item: all<AvatarItem>({
    none: true,
    cat: true,
    headphones: true,
    cap: true,
    flower: true,
    crown: true,
    sprout: true,
  }),
  detail: all<AvatarDetail>({
    none: true,
    bindi: true,
    jhumkas: true,
    beard: true,
    moustache: true,
    freckles: true,
    blush: true,
  }),
  bg: all<AvatarBg>({
    lilac: true,
    sun: true,
    peach: true,
    sky: true,
    mint: true,
    paper: true,
    grey: true,
  }),
};

// The order the parts are written in the code.
export const AVATAR_ORDER: readonly (keyof AvatarParts)[] = [
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

// PATCH /me checks `avatar` against this: one known id per part, in order.
export const AVATAR_CODE_PATTERN = new RegExp(
  `^${AVATAR_ORDER.map((part) => `(${AVATAR_PARTS[part].join('|')})`).join('\\.')}$`,
);

export function encodeAvatar(parts: AvatarParts): AvatarCode {
  return AVATAR_ORDER.map((part) => parts[part]).join('.');
}

export function isAvatarCode(code: string): boolean {
  return AVATAR_CODE_PATTERN.test(code);
}

// The twelve presets from before the avatar maker (ADR-044), redrawn as
// parts so learners who picked one keep the same look.
const LEGACY: Record<string, AvatarCode> = {
  a1: 's4.smile.long.black.kurta.sky.none.none.bindi.sky',
  a2: 's5.smile.short.black.tee.sun.round.none.none.sun',
  a3: 's3.smile.bun.darkbrown.kurta.coral.none.none.bindi.peach',
  a4: 's6.smile.patka.auburn.tee.teal.none.none.beard.mint',
  a5: 's2.smile.side.darkbrown.sweater.violet.none.none.none.lilac',
  a6: 's5.smile.fluffy.black.hoodie.coral.none.none.jhumkas.peach',
  a7: 's4.smile.buzz.black.collar.sky.none.none.moustache.sky',
  a8: 's2.smile.long.darkbrown.tee.teal.round.none.none.mint',
  a9: 's5.smile.bun.black.kurta.sun.none.none.jhumkas.sun',
  a10: 's3.smile.side.black.collar.coral.square.none.moustache.peach',
  a11: 's5.smile.patka.blue.hoodie.sun.none.none.beard.peach',
  a12: 's2.smile.fluffy.darkbrown.sweater.violet.round.none.none.lilac',
};

// Defaults draw only from natural hair colours and leave most extras off,
// so nobody starts with blue hair and a crown they didn't choose.
const DEFAULT_POOL: { [K in keyof AvatarParts]: readonly AvatarParts[K][] } = {
  ...AVATAR_PARTS,
  face: ['dots', 'smile', 'grin'],
  hair: [
    'fluffy',
    'short',
    'side',
    'long',
    'bob',
    'bun',
    'braid',
    'patka',
    'buzz',
  ],
  hairColor: ['black', 'black', 'darkbrown', 'brown'],
  glasses: ['none', 'none', 'none', 'round', 'square'],
  item: ['none', 'none', 'none', 'none', 'none', 'cat', 'headphones', 'flower'],
  detail: ['none', 'none', 'none', 'bindi', 'jhumkas', 'beard', 'blush'],
};

// The avatar to show for a user: the one they made, or a default that is
// always the same for them, so nobody shows up blank.
export function avatarOf(userId: string, chosen: string | null): AvatarCode {
  if (chosen && isAvatarCode(chosen)) return chosen;
  if (chosen && LEGACY[chosen]) return LEGACY[chosen];

  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const parts = {} as Record<keyof AvatarParts, string>;
  for (const part of AVATAR_ORDER) {
    const pool = DEFAULT_POOL[part];
    parts[part] = pool[hash % pool.length];
    // A cheap mix so each part reads different bits of the hash.
    hash = (Math.imul(hash ^ (hash >>> 15), 2246822507) + 1) >>> 0;
  }
  return encodeAvatar(parts as AvatarParts);
}
