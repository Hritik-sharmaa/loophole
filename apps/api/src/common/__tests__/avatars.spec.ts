import {
  AVATAR_ORDER,
  AVATAR_PARTS,
  avatarOf,
  isAvatarCode,
} from '../avatars.js';

const MADE = 's3.dots.fluffy.black.hoodie.violet.none.cat.none.lilac';

describe('isAvatarCode', () => {
  it('accepts one known part per slot, in order', () => {
    expect(isAvatarCode(MADE)).toBe(true);
  });

  it('refuses unknown parts, missing parts and the old preset ids', () => {
    expect(isAvatarCode(MADE.replace('cat', 'dragon'))).toBe(false);
    expect(isAvatarCode(MADE.split('.').slice(0, 9).join('.'))).toBe(false);
    expect(isAvatarCode(`${MADE}.extra`)).toBe(false);
    expect(isAvatarCode('a5')).toBe(false);
    expect(isAvatarCode('')).toBe(false);
  });

  it('refuses parts in the wrong slot', () => {
    // "violet" is a top colour and a hair colour, but never a skin tone.
    expect(isAvatarCode(MADE.replace('s3', 'violet'))).toBe(false);
  });
});

describe('avatarOf', () => {
  it('uses the avatar the learner made', () => {
    expect(avatarOf('user-1', MADE)).toBe(MADE);
  });

  it('turns an old preset into the same look built from parts', () => {
    const code = avatarOf('user-1', 'a7');
    expect(isAvatarCode(code)).toBe(true);
    expect(code).toContain('buzz');
  });

  it('gives everyone else a valid default that never changes', () => {
    const id = '8d5c2f0e-1111-4111-8111-111111111111';
    expect(avatarOf(id, null)).toBe(avatarOf(id, null));
    expect(isAvatarCode(avatarOf(id, null))).toBe(true);
    expect(isAvatarCode(avatarOf('user-1', 'not-an-avatar'))).toBe(true);
  });

  it('spreads the defaults across hairstyles, skin tones and tops', () => {
    const codes = Array.from({ length: 300 }, (_, i) =>
      avatarOf(`user-${i}`, null).split('.'),
    );
    for (const part of ['skin', 'hair', 'top', 'bg'] as const) {
      const slot = AVATAR_ORDER.indexOf(part);
      const seen = new Set(codes.map((c) => c[slot]));
      // Every default-pool option shows up for these parts.
      expect(seen.size).toBeGreaterThanOrEqual(
        part === 'hair' ? 9 : AVATAR_PARTS[part].length,
      );
    }
  });

  it('never gives a default dyed hair', () => {
    const slot = AVATAR_ORDER.indexOf('hairColor');
    for (let i = 0; i < 300; i++) {
      const colour = avatarOf(`user-${i}`, null).split('.')[slot];
      expect(['violet', 'blue', 'pink', 'grey']).not.toContain(colour);
    }
  });
});
