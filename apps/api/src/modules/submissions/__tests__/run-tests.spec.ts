import { oneRunAtATime } from '../run-tests.js';

describe('oneRunAtATime', () => {
  it("refuses a user's second run while the first is going, then allows it", async () => {
    let finish = () => {};
    const first = oneRunAtATime(
      'u1',
      () => new Promise<void>((resolve) => (finish = resolve)),
    );

    await expect(
      oneRunAtATime('u1', () => Promise.resolve()),
    ).rejects.toMatchObject({ response: { code: 'RATE_LIMITED' } });
    // Another user is not affected.
    await expect(oneRunAtATime('u2', () => Promise.resolve(2))).resolves.toBe(
      2,
    );

    finish();
    await first;
    await expect(oneRunAtATime('u1', () => Promise.resolve(1))).resolves.toBe(
      1,
    );
  });

  it('frees the user when the run fails', async () => {
    await expect(
      oneRunAtATime('u3', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(oneRunAtATime('u3', () => Promise.resolve(1))).resolves.toBe(
      1,
    );
  });
});
