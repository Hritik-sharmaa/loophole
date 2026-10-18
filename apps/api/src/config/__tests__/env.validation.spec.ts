import { validateEnv } from '../env.validation.js';

describe('validateEnv', () => {
  const required = {
    CORS_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://postgres:pw@localhost:5432/postgres',
    SUPABASE_URL: 'https://abc.supabase.co',
    SUPABASE_SERVICE_KEY: 'service-key',
    PISTON_URL: 'http://localhost:2000',
  };
  const valid = { PORT: '3001', ...required };

  it('accepts a valid config and converts PORT to a number', () => {
    expect(validateEnv(valid)).toMatchObject({
      PORT: 3001,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('defaults PORT to 3001 when it is not set', () => {
    expect(validateEnv(required).PORT).toBe(3001);
  });

  it.each([
    [
      'CORS_ORIGIN is missing',
      { ...valid, CORS_ORIGIN: undefined },
      /CORS_ORIGIN/,
    ],
    [
      'CORS_ORIGIN is not a URL',
      { ...valid, CORS_ORIGIN: 'nope' },
      /CORS_ORIGIN/,
    ],
    ['PORT is not a number', { ...valid, PORT: 'abc' }, /PORT/],
    ['PORT is out of range', { ...valid, PORT: '70000' }, /PORT/],
    [
      'DATABASE_URL is not a postgres URL',
      { ...valid, DATABASE_URL: 'http://localhost:5432' },
      /DATABASE_URL/,
    ],
    [
      'SUPABASE_URL is missing',
      { ...valid, SUPABASE_URL: undefined },
      /SUPABASE_URL/,
    ],
    [
      'SUPABASE_SERVICE_KEY is empty',
      { ...valid, SUPABASE_SERVICE_KEY: '' },
      /SUPABASE_SERVICE_KEY/,
    ],
    [
      'PISTON_URL is missing',
      { ...valid, PISTON_URL: undefined },
      /PISTON_URL/,
    ],
  ])('throws when %s', (_case, config, message) => {
    expect(() => validateEnv(config)).toThrow(message);
  });
});
