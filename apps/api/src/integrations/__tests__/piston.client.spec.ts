import { BadGatewayException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { MAX_PENDING_RUNS, PistonClient } from '../piston.client.js';

const config = {
  get: () => 'http://piston.test:2000',
} as unknown as ConfigService<EnvironmentVariables, true>;

const stage = (over: object = {}) => ({
  stdout: '',
  stderr: '',
  code: 0,
  signal: null,
  ...over,
});

const respond = (body: object, status = 200) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));

// fetch is stubbed: these check how we talk to Piston and read its answer.
describe('PistonClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the code, stdin and limits to /api/v2/execute', async () => {
    const fetch = respond({ run: stage({ stdout: 'hi\n' }) });
    vi.stubGlobal('fetch', fetch);

    const result = await new PistonClient(config).run('python', 'code', 'in');

    expect(result).toEqual({
      stdout: 'hi\n',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://piston.test:2000/api/v2/execute');
    expect(JSON.parse(init.body as string)).toMatchObject({
      language: 'python',
      version: '*',
      files: [{ name: 'main.py', content: 'code' }],
      stdin: 'in',
      run_timeout: 3000,
      run_memory_limit: 256 * 1024 * 1024,
    });
  });

  it.each([
    ['status TO', { status: 'TO', signal: 'SIGKILL', code: null }, true],
    ['old Piston: SIGKILL, no status', { signal: 'SIGKILL', code: null }, true],
    ['too much output (OL)', { status: 'OL', signal: 'SIGKILL' }, false],
    ['runtime error', { status: 'RE', code: 1 }, false],
  ])('timedOut for %s', async (_case, over, timedOut) => {
    vi.stubGlobal('fetch', respond({ run: stage(over) }));
    const result = await new PistonClient(config).run('python', '', '');
    expect(result.timedOut).toBe(timedOut);
  });

  it('returns the compile stage when compiling failed', async () => {
    vi.stubGlobal(
      'fetch',
      respond({
        compile: stage({ stderr: 'syntax error', code: 1 }),
        run: stage(),
      }),
    );
    const result = await new PistonClient(config).run('c', '', '');
    expect(result).toMatchObject({ stderr: 'syntax error', exitCode: 1 });
  });

  it('throws 502 EXECUTOR_UNAVAILABLE when Piston refuses the job', async () => {
    vi.stubGlobal(
      'fetch',
      respond({ message: 'python-* runtime is unknown' }, 400),
    );
    await expect(
      new PistonClient(config).run('python', '', ''),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws 502 when Piston cannot be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));
    await expect(
      new PistonClient(config).run('python', '', ''),
    ).rejects.toMatchObject({
      response: { code: 'EXECUTOR_UNAVAILABLE' },
    });
  });

  // Overlapping jobs crash Piston's sandbox, so runs must never overlap.
  it('sends one run at a time, even when callers ask at once', async () => {
    let active = 0;
    let maxActive = 0;
    vi.stubGlobal('fetch', async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return new Response(JSON.stringify({ run: stage() }));
    });

    const client = new PistonClient(config);
    await Promise.all([1, 2, 3, 4].map(() => client.run('python', '', '')));
    expect(maxActive).toBe(1);
  });

  it('refuses with 503 EXECUTOR_BUSY once the queue is full, then recovers', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.stubGlobal('fetch', async () => {
      await gate;
      return new Response(JSON.stringify({ run: stage() }));
    });

    const client = new PistonClient(config);
    const queued = Array.from({ length: MAX_PENDING_RUNS }, () =>
      client.run('python', '', ''),
    );
    await expect(client.run('python', '', '')).rejects.toMatchObject({
      response: { code: 'EXECUTOR_BUSY' },
    });

    release();
    await Promise.all(queued);
    await expect(client.run('python', '', '')).resolves.toBeDefined();
  });

  it('a failed run does not block the next one', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ run: stage({ stdout: 'ok' }) })),
      );
    vi.stubGlobal('fetch', fetch);

    const client = new PistonClient(config);
    const [first, second] = await Promise.allSettled([
      client.run('python', '', ''),
      client.run('python', '', ''),
    ]);
    expect(first.status).toBe('rejected');
    expect(second).toMatchObject({ value: { stdout: 'ok' } });
  });
});
