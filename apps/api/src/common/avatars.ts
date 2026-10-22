import type { AvatarId } from '@loophole/shared';

// Learner avatars (ADR-044): preset illustrations, drawn by the web app
// (components/avatar.tsx). The API only stores and checks the id.
export const AVATAR_IDS: readonly AvatarId[] = [
  'a1',
  'a2',
  'a3',
  'a4',
  'a5',
  'a6',
  'a7',
  'a8',
  'a9',
  'a10',
  'a11',
  'a12',
];

// The avatar to show for a user: the one they picked, or a default that
// is always the same for them, so nobody shows up blank.
export function avatarOf(userId: string, chosen: string | null): AvatarId {
  if (chosen && (AVATAR_IDS as readonly string[]).includes(chosen)) {
    return chosen as AvatarId;
  }
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_IDS[hash % AVATAR_IDS.length];
}
