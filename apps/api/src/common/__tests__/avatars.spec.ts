import { AVATAR_IDS, avatarOf } from '../avatars.js';

describe('avatarOf', () => {
  it('uses the avatar the learner picked', () => {
    expect(avatarOf('user-1', 'a7')).toBe('a7');
  });

  it('gives everyone else a default that never changes', () => {
    const id = '8d5c2f0e-1111-4111-8111-111111111111';
    expect(avatarOf(id, null)).toBe(avatarOf(id, null));
    expect(AVATAR_IDS).toContain(avatarOf(id, null));
  });

  it('ignores an id that is not a preset', () => {
    expect(AVATAR_IDS).toContain(avatarOf('user-1', 'not-an-avatar'));
  });

  it('spreads the defaults across the set', () => {
    const seen = new Set(
      Array.from({ length: 200 }, (_, i) => avatarOf(`user-${i}`, null)),
    );
    expect(seen.size).toBe(AVATAR_IDS.length);
  });
});
