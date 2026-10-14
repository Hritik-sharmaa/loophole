import { validateEnv } from '../env.validation.js';

describe('validateEnv', () => {
  const valid = { PORT: '3001', CORS_ORIGIN: 'http://localhost:3000' };

  it('accepts a valid config and converts PORT to a number', () => {
    expect(validateEnv(valid)).toMatchObject({
      PORT: 3001,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('defaults PORT to 3001 when it is not set', () => {
    expect(validateEnv({ CORS_ORIGIN: valid.CORS_ORIGIN }).PORT).toBe(3001);
  });

  it.each([
    ['CORS_ORIGIN is missing', { PORT: '3001' }, /CORS_ORIGIN/],
    [
      'CORS_ORIGIN is not a URL',
      { ...valid, CORS_ORIGIN: 'nope' },
      /CORS_ORIGIN/,
    ],
    ['PORT is not a number', { ...valid, PORT: 'abc' }, /PORT/],
    ['PORT is out of range', { ...valid, PORT: '70000' }, /PORT/],
  ])('throws when %s', (_case, config, message) => {
    expect(() => validateEnv(config)).toThrow(message);
  });
});
