import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { BotDuel, BotDuelSubmission } from '@loophole/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { duelProblems } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { BotDuelsService } from '../src/modules/bot-duels/bot-duels.service.js';
import {
  CONTENT_DIR,
  createTestDb,
  createTestUser,
  type TestDb,
} from './support/test-db.js';

const USERS: Record<string, AuthUser> = {
  ada: {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'ada@example.com',
    name: 'Ada',
  },
  bob: {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'bob@example.com',
    name: 'Bob',
  },
};

const START = new Date('2026-10-21T10:00:00Z');
const at = (seconds: number) => new Date(START.getTime() + seconds * 1000);

// Real HTTP stack + real SQL (PGlite) + the real duel pool. Supabase and
// Piston are stubbed, and the clock is faked so the bot can be outrun.
describe('Bot duels (e2e, ADR-039)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  // Every response body, checked for hidden tests at the end.
  const bodies: unknown[] = [];
  // problemId → (stdin → expected stdout): "solve:<id>" prints the answers.
  const answers = new Map<string, Map<string, string>>();
  // Runs while a submission is being graded (to race it).
  let duringGrading: (() => Promise<void>) | null = null;

  const http = () => request(app.getHttpServer());
  const send = async (
    who: string,
    method: 'get' | 'post',
    url: string,
    body?: object,
    status = method === 'get' ? 200 : 201,
  ) => {
    const req = http()[method](url).set('Authorization', `Bearer ${who}`);
    const res = await (body ? req.send(body) : req).expect(status);
    bodies.push(res.body);
    return res.body as unknown;
  };
  const start = (who: string, opponent = 'arjun', language = 'python') =>
    send(who, 'post', '/bot-duels', { opponent, language }) as Promise<BotDuel>;
  const get = (who: string, id: string, status?: number) =>
    send(who, 'get', `/bot-duels/${id}`, undefined, status) as Promise<BotDuel>;
  const submit = (who: string, id: string, code: string, status?: number) =>
    send(
      who,
      'post',
      `/bot-duels/${id}/submissions`,
      { code },
      status,
    ) as Promise<BotDuelSubmission>;
  const solveCode = async (duel: BotDuel) => {
    const [p] = (await db.select().from(duelProblems)).filter(
      (p) =>
        p.title === duel.problem.title && p.language === duel.problem.language,
    );
    return `solve:${p.id}`;
  };

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const [name, user] of Object.entries(USERS)) {
      await createTestUser(db, user.id, name);
    }
    for (const p of await db.select().from(duelProblems)) {
      const tests = [...p.sampleTests, ...p.hiddenTests];
      answers.set(p.id, new Map(tests.map((t) => [t.input, t.expectedOutput])));
    }

    const run = async (_language: string, code: string, stdin: string) => {
      if (duringGrading) {
        const hook = duringGrading;
        duringGrading = null;
        await hook();
      }
      // The first line only: JavaScript programs get the prompt() helper
      // appended before they run.
      const id = code.split('\n')[0].replace('solve:', '');
      const out: RunResult = {
        stdout: answers.get(id)?.get(stdin) ?? '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
      return out;
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: (token: string) => Promise.resolve(USERS[token]) })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  beforeEach(() => vi.setSystemTime(START));

  afterAll(async () => {
    vi.useRealTimers();
    await app.close();
    await testDb.close();
  });

  it('starts a race with a five-minute clock and the bot’s schedule', async () => {
    const duel = await start('ada', 'harpreet');
    expect(duel).toMatchObject({
      opponent: 'harpreet',
      startedAt: START.toISOString(),
      endsAt: at(300).toISOString(),
      result: null,
      timeMs: null,
      attempts: 0,
    });
    expect(duel.botSchedule).toHaveLength(duel.totalTests);
    // Harpreet finishes in 105 s, give or take 15.
    expect(duel.botSchedule.at(-1)).toBeGreaterThanOrEqual(90_000);
    expect(duel.botSchedule.at(-1)).toBeLessThanOrEqual(120_000);
    expect(duel.problem.sampleTests.length).toBeGreaterThan(0);
  });

  it('a fix that passes before the bot finishes wins', async () => {
    const duel = await start('ada');
    vi.setSystemTime(at(5));
    const wrong = await submit('ada', duel.id, 'print("nope")');
    expect(wrong.status).toBe('failed');
    expect(wrong.duel.result).toBeNull();

    vi.setSystemTime(at(42));
    const fix = await submit('ada', duel.id, await solveCode(duel));
    expect(fix.status).toBe('passed');
    expect(fix.duel).toMatchObject({
      result: 'won',
      timeMs: 42_000,
      attempts: 2,
    });

    // Over: later reads keep the win, and no more submissions.
    vi.setSystemTime(at(299));
    expect((await get('ada', duel.id)).result).toBe('won');
    await submit('ada', duel.id, await solveCode(duel), 409);
  });

  it('once the bot finishes, the race is lost and closed', async () => {
    const duel = await start('ada', 'meera');
    vi.setSystemTime(new Date(START.getTime() + duel.botSchedule.at(-1)!));
    expect(await get('ada', duel.id)).toMatchObject({
      result: 'lost',
      timeMs: null,
    });
    await submit('ada', duel.id, await solveCode(duel), 409);
  });

  it('a fix sent before the bot finished still wins if a read marked it lost while grading', async () => {
    const duel = await start('ada', 'harpreet');
    const finish = duel.botSchedule.at(-1)!;
    // One second before the bot's finish...
    vi.setSystemTime(new Date(START.getTime() + finish - 1000));
    // ...and while it is graded, the page polls after the bot's finish.
    duringGrading = async () => {
      const after = new Date(START.getTime() + finish + 2000);
      const seen = await app
        .get(BotDuelsService)
        .get(USERS.ada.id, duel.id, after);
      expect(seen.result).toBe('lost');
    };
    const fix = await submit('ada', duel.id, await solveCode(duel));
    expect(fix.duel).toMatchObject({ result: 'won', timeMs: finish - 1000 });
  });

  it('giving up ends the race', async () => {
    const duel = await start('ada');
    const gaveUp = (await send(
      'ada',
      'post',
      `/bot-duels/${duel.id}/forfeit`,
    )) as BotDuel;
    expect(gaveUp.result).toBe('gave-up');
    await send('ada', 'post', `/bot-duels/${duel.id}/forfeit`, undefined, 409);
  });

  it('someone else’s race is not found', async () => {
    const duel = await start('ada');
    await get('bob', duel.id, 404);
    await submit('bob', duel.id, 'print(1)', 404);
  });

  it('races in the language picked: a JavaScript problem (ADR-040)', async () => {
    const duel = await start('ada', 'meera', 'javascript');
    expect(duel.problem.language).toBe('javascript');
    expect(duel.problem.buggyCode).toContain('prompt()');
    const fix = await submit('ada', duel.id, await solveCode(duel));
    expect(fix.duel.result).toBe('won');
  });

  it('rejects an unknown opponent or language, and a bad id', async () => {
    await send(
      'ada',
      'post',
      '/bot-duels',
      { opponent: 'byte', language: 'python' },
      400,
    );
    await send(
      'ada',
      'post',
      '/bot-duels',
      { opponent: 'meera', language: 'ruby' },
      400,
    );
    await send('ada', 'post', '/bot-duels', { opponent: 'meera' }, 400);
    await get('ada', 'not-a-uuid', 400);
  });

  // AGENTS.md hard rule 2: hidden tests never leave the server.
  it('no response contains hidden tests', () => {
    expect(bodies.length).toBeGreaterThan(10);
    for (const body of bodies) {
      expect(JSON.stringify(body)).not.toMatch(/hidden_?tests/i);
    }
  });
});
