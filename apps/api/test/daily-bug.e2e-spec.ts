import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  DailyBugBoard,
  DailyBugResult,
  DailyBugToday,
  MeResponse,
} from '@loophole/shared';
import { and, asc, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { dailyBugPlays, duelProblems } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { dailyPick } from '../src/modules/daily-bug/daily-bug-rules.js';
import {
  CONTENT_DIR,
  createTestDb,
  createTestUser,
  type TestDb,
} from './support/test-db.js';

const USERS: Record<string, AuthUser> = {
  ada: {
    id: '91111111-1111-4111-8111-111111111111',
    email: 'ada@example.com',
    name: 'Ada',
  },
  bob: {
    id: '92222222-2222-4222-8222-222222222222',
    email: 'bob@example.com',
    name: 'Bob',
  },
  cara: {
    id: '93333333-3333-4333-8333-333333333333',
    email: 'cara@example.com',
    name: 'Cara',
  },
};

// IST wall-clock times.
const ist = (dayAndTime: string) => new Date(`${dayAndTime}+05:30`);

// Real HTTP stack + real SQL (PGlite) + the real duel problem pool.
// Supabase and Piston are stubbed, and the clock is faked.
describe('Bug of the day (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  // Every response body, checked for hidden tests at the end.
  const bodies: unknown[] = [];
  // problemId → (stdin → expected stdout): "solve:<id>" prints the answers.
  const answers = new Map<string, Map<string, string>>();

  const http = () => request(app.getHttpServer());
  const as = (who: string) => ({
    get: async (url: string, status = 200) => {
      const res = await http()
        .get(url)
        .set('Authorization', `Bearer ${who}`)
        .expect(status);
      bodies.push(res.body);
      return res.body as unknown;
    },
    submit: async (code: string, status = 201) => {
      const res = await http()
        .post('/bug-of-the-day/submissions')
        .set('Authorization', `Bearer ${who}`)
        .send({ code })
        .expect(status);
      bodies.push(res.body);
      return res.body as unknown;
    },
  });
  const today = (who: string) =>
    as(who).get('/bug-of-the-day') as Promise<DailyBugToday>;
  const board = (who: string) =>
    as(who).get('/bug-of-the-day/board') as Promise<DailyBugBoard>;
  const submit = (who: string, code: string) =>
    as(who).submit(code) as Promise<DailyBugResult>;

  // The id of the problem picked for an IST day, worked out independently.
  const pickFor = async (day: string) => {
    const pool = await db
      .select({ id: duelProblems.id })
      .from(duelProblems)
      .where(eq(duelProblems.language, 'python'))
      .orderBy(asc(duelProblems.slug));
    return pool[dailyPick(day, pool.length)].id;
  };
  const solveCode = async (day: string) => `solve:${await pickFor(day)}`;

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

    const run = (_language: string, code: string, stdin: string) => {
      const out: RunResult = {
        stdout: answers.get(code.replace('solve:', ''))?.get(stdin) ?? '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
      return Promise.resolve(out);
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: (t: string) => Promise.resolve(USERS[t] ?? null) })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.close();
    await testDb.close();
  });

  it('GET /bug-of-the-day gives everyone the same bug and starts their clock', async () => {
    vi.setSystemTime(ist('2026-10-20T09:00:00'));
    const mine = await today('ada');
    const [picked] = await db
      .select({ title: duelProblems.title, buggyCode: duelProblems.buggyCode })
      .from(duelProblems)
      .where(eq(duelProblems.id, await pickFor('2026-10-20')));

    expect(mine.day).toBe('2026-10-20');
    expect(mine.problem).toMatchObject(picked);
    expect(mine.problem.sampleTests.length).toBeGreaterThan(0);
    expect(mine.me).toEqual({
      openedAt: ist('2026-10-20T09:00:00').toISOString(),
      solvedAt: null,
      timeMs: null,
      attempts: 0,
    });
    expect((await today('bob')).problem.title).toBe(picked.title);

    // Opening it again later doesn't restart the clock.
    vi.setSystemTime(ist('2026-10-20T09:00:30'));
    expect((await today('ada')).me.openedAt).toBe(mine.me.openedAt);
  });

  it('the board is empty before anyone solves it, and reading it starts no clock', async () => {
    const empty = await board('cara');
    expect(empty).toMatchObject({
      day: '2026-10-20',
      solvers: 0,
      entries: [],
      me: null,
      started: false,
    });
    expect((await board('ada')).started).toBe(true);

    const caraPlays = await db
      .select()
      .from(dailyBugPlays)
      .where(eq(dailyBugPlays.userId, USERS.cara.id));
    expect(caraPlays).toEqual([]);
  });

  it('submitting without opening the bug is 409 NOT_STARTED', async () => {
    const body = await as('cara').submit('anything', 409);
    expect(body).toMatchObject({ error: { code: 'NOT_STARTED' } });
  });

  it('rejects a body with anything but code (400)', async () => {
    const res = await http()
      .post('/bug-of-the-day/submissions')
      .set('Authorization', 'Bearer ada')
      .send({ code: 'x', problemId: 'mine' })
      .expect(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('a wrong fix fails, counts an attempt and pays nothing', async () => {
    vi.setSystemTime(ist('2026-10-20T09:01:00'));
    const wrong = await submit('ada', 'print("still buggy")');
    expect(wrong).toMatchObject({
      status: 'failed',
      solved: false,
      xpAwarded: 0,
      timeMs: null,
      rank: null,
      solvers: 0,
    });
    // Hidden tests report only whether they passed.
    for (const r of wrong.results.filter((r) => r.kind === 'hidden')) {
      expect(Object.keys(r).sort()).toEqual(['kind', 'passed']);
    }
  });

  it('the first right fix solves it: timed from opening, 20 XP, once', async () => {
    vi.setSystemTime(ist('2026-10-20T09:03:30'));
    const solved = await submit('ada', await solveCode('2026-10-20'));
    expect(solved).toMatchObject({
      status: 'passed',
      solved: true,
      xpAwarded: 20,
      timeMs: 210_000,
      rank: 1,
      solvers: 1,
    });

    // XP counts toward the total and today's goal, not the streak (FR-10).
    expect(await (as('ada').get('/me') as Promise<MeResponse>)).toMatchObject({
      xp: 20,
      todayXp: 20,
      streak: { current: 0 },
    });

    // Solving again later keeps the first time and pays nothing.
    vi.setSystemTime(ist('2026-10-20T10:00:00'));
    const again = await submit('ada', await solveCode('2026-10-20'));
    expect(again).toMatchObject({
      solved: true,
      xpAwarded: 0,
      timeMs: 210_000,
    });
    expect((await today('ada')).me).toMatchObject({
      solvedAt: ist('2026-10-20T09:03:30').toISOString(),
      timeMs: 210_000,
      attempts: 3,
    });
  });

  it('the board ranks today by time taken, fastest first', async () => {
    // bob opened at 09:00 and solves at 10:02: slower than ada's 3 m 30 s.
    vi.setSystemTime(ist('2026-10-20T10:02:00'));
    const bob = await submit('bob', await solveCode('2026-10-20'));
    expect(bob).toMatchObject({ rank: 2, solvers: 2, timeMs: 3_720_000 });

    const seenByAda = await board('ada');
    expect(
      seenByAda.entries.map((e) => [e.rank, e.username, e.timeMs]),
    ).toEqual([
      [1, 'ada', 210_000],
      [2, 'bob', 3_720_000],
    ]);
    expect(seenByAda.entries[0].attempts).toBe(3);
    expect(seenByAda.me).toEqual({ rank: 1, timeMs: 210_000 });
    expect((await board('cara')).me).toBeNull();
  });

  it('a new IST day brings a new bug; yesterday’s play cannot be submitted', async () => {
    vi.setSystemTime(ist('2026-10-21T00:00:10'));
    const late = await as('ada').submit(await solveCode('2026-10-20'), 409);
    expect(late).toMatchObject({ error: { code: 'NOT_STARTED' } });

    const fresh = await today('ada');
    expect(fresh.day).toBe('2026-10-21');
    expect(fresh.me).toMatchObject({ solvedAt: null, attempts: 0 });
    const [newPick] = await db
      .select({ title: duelProblems.title })
      .from(duelProblems)
      .where(eq(duelProblems.id, await pickFor('2026-10-21')));
    expect(fresh.problem.title).toBe(newPick.title);
    expect(await pickFor('2026-10-21')).not.toBe(await pickFor('2026-10-20'));

    expect(await board('ada')).toMatchObject({ solvers: 0, me: null });
    const plays = await db
      .select()
      .from(dailyBugPlays)
      .where(
        and(
          eq(dailyBugPlays.userId, USERS.ada.id),
          eq(dailyBugPlays.day, '2026-10-21'),
        ),
      );
    expect(plays).toHaveLength(1);
  });

  // AGENTS.md hard rule 2: hidden tests never leave the server.
  it('no response contains hidden tests', () => {
    expect(bodies.length).toBeGreaterThan(10);
    for (const body of bodies) {
      expect(JSON.stringify(body)).not.toMatch(/hidden_?tests/i);
    }
  });
});
