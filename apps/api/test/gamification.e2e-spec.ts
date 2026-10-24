import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  ActivityResponse,
  CoursePath,
  MeResponse,
  SubmissionResult,
  WeeklyLeaderboard,
} from '@loophole/shared';
import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { avatarOf } from '../src/common/avatars.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { exercises, xpEvents } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { CONTENT_DIR, createTestDb, type TestDb } from './support/test-db.js';

const USERS: Record<string, AuthUser> = {
  ada: {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'ada@example.com',
    name: 'Ada',
  },
  bob: {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'bob@example.com',
    name: 'Bob',
  },
  cara: {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'cara@example.com',
    name: 'Cara',
  },
  dan: {
    id: '88888888-8888-4888-8888-888888888881',
    email: 'dan@example.com',
    name: 'Dan',
  },
};

// IST wall-clock times in the week of Monday 2026-10-12.
const ist = (dayAndTime: string) => new Date(`${dayAndTime}+05:30`);

// Real HTTP stack + real SQL (PGlite). Supabase and Piston are stubbed, and
// the clock is faked so the test can move between days and weeks.
describe('XP, streak and leaderboard (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let lessonIds: string[];
  // exerciseId → (stdin → expected stdout), so "solve:<id>" prints answers.
  const answers = new Map<string, Map<string, string>>();
  let exerciseOfLesson: Map<string, string>;

  const as = (who: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${who}`)
        .expect(200)
        .then((res) => res.body as unknown),
    patch: (url: string, body: object) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${who}`)
        .send(body)
        .expect(200)
        .then((res) => res.body as unknown),
    solve: (lessonIndex: number) => {
      const exerciseId = exerciseOfLesson.get(lessonIds[lessonIndex])!;
      return request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', `Bearer ${who}`)
        .send({ exerciseId, code: `solve:${exerciseId}` })
        .expect(201)
        .then((res) => res.body as SubmissionResult);
    },
  });
  const me = (who: string) => as(who).get('/me') as Promise<MeResponse>;
  const board = (who: string) =>
    as(who).get('/leaderboard/weekly') as Promise<WeeklyLeaderboard>;

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const { id } of Object.values(USERS)) {
      await db.execute(`insert into auth.users (id) values ('${id}')`);
    }
    const rows = await db.select().from(exercises);
    for (const e of rows) {
      const tests = [...e.sampleTests, ...e.hiddenTests];
      answers.set(e.id, new Map(tests.map((t) => [t.input, t.expectedOutput])));
    }
    exerciseOfLesson = new Map(rows.map((e) => [e.lessonId, e.id]));

    const run = (_lang: string, code: string, stdin: string) => {
      const expected = answers.get(code.replace('solve:', ''))?.get(stdin);
      const result: RunResult = {
        stdout: expected ?? '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
      return Promise.resolve(result);
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
    vi.setSystemTime(ist('2026-10-13T10:00:00'));
    const path = (await as('ada').get('/courses/python/path')) as CoursePath;
    lessonIds = path.units.flatMap((u) => u.lessons.map((l) => l.id));
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.close();
    await testDb.close();
  });

  it('a new user starts at 0 XP and no streak', async () => {
    expect(await me('ada')).toMatchObject({
      xp: 0,
      streak: { current: 0, longest: 0, freezes: 0 },
    });
  });

  it('a new user has no daily goal until they pick one (ADR-033)', async () => {
    expect(await me('ada')).toMatchObject({ dailyGoal: null, todayXp: 0 });
    const saved = (await as('ada').patch('/me', {
      dailyGoal: 20,
    })) as MeResponse;
    expect(saved.dailyGoal).toBe(20);
    expect((await me('ada')).dailyGoal).toBe(20);
  });

  it('day 1: the first completion pays 10 XP and starts the streak (J-1)', async () => {
    expect((await as('ada').solve(0)).xpAwarded).toBe(10);
    expect(await me('ada')).toMatchObject({
      xp: 10,
      streak: { current: 1, longest: 1 },
    });
  });

  it('day 1: a repeated completion pays nothing (FR-09)', async () => {
    const again = await as('ada').solve(0);
    expect(again).toMatchObject({ lessonCompleted: true, xpAwarded: 0 });

    const [{ n }] = await db
      .select({ n: count() })
      .from(xpEvents)
      .where(eq(xpEvents.userId, USERS.ada.id));
    expect(n).toBe(1);
    expect((await me('ada')).xp).toBe(10);
  });

  it('day 1: a second new lesson the same day adds XP, not streak', async () => {
    expect((await as('ada').solve(1)).xpAwarded).toBe(10);
    expect(await me('ada')).toMatchObject({
      xp: 20,
      todayXp: 20,
      streak: { current: 1 },
    });
  });

  it('day 2: re-solving an old lesson does not move the streak', async () => {
    vi.setSystemTime(ist('2026-10-14T09:00:00'));
    await as('ada').solve(0);
    // Still alive (active yesterday), but not extended.
    expect((await me('ada')).streak.current).toBe(1);
    // A new IST day starts the daily goal from 0.
    expect((await me('ada')).todayXp).toBe(0);
  });

  it('day 2, just before midnight IST: a new lesson extends the streak (J-4)', async () => {
    vi.setSystemTime(ist('2026-10-14T23:59:00'));
    await as('ada').solve(2);
    expect(await me('ada')).toMatchObject({
      xp: 30,
      todayXp: 10,
      streak: { current: 2, longest: 2 },
    });
  });

  it('day 4 after missing day 3: the streak shows 0, then restarts at 1', async () => {
    vi.setSystemTime(ist('2026-10-16T08:00:00'));
    expect((await me('ada')).streak).toMatchObject({ current: 0, longest: 2 });

    await as('ada').solve(3);
    expect((await me('ada')).streak).toMatchObject({ current: 1, longest: 2 });
  });

  it('GET /me/activity gives XP per IST day over five weeks (ADR-033)', async () => {
    const activity = (await as('ada').get('/me/activity')) as ActivityResponse;
    // Friday 2026-10-16: this week's Monday is 10-12, four weeks before is 09-14.
    expect(activity).toEqual({
      from: '2026-09-14',
      today: '2026-10-16',
      days: [
        { date: '2026-10-13', xp: 20 },
        { date: '2026-10-14', xp: 10 },
        { date: '2026-10-16', xp: 10 },
      ],
    });
  });

  it('the weekly board ranks by XP since Monday, with the caller’s rank', async () => {
    await as('bob').solve(0); // bob: 10 XP

    const forAda = await board('ada');
    expect(forAda.weekStart).toBe(ist('2026-10-12T00:00:00').toISOString());
    // Nobody picked an avatar yet: each shows their default (ADR-046).
    expect(forAda.entries).toEqual([
      {
        rank: 1,
        userId: USERS.ada.id,
        username: 'ada',
        avatar: avatarOf(USERS.ada.id, null),
        xp: 40,
      },
      {
        rank: 2,
        userId: USERS.bob.id,
        username: 'bob',
        avatar: avatarOf(USERS.bob.id, null),
        xp: 10,
      },
    ]);
    expect(forAda.me).toEqual({ rank: 1, xp: 40 });

    // cara has no XP this week: not on the board, rank null.
    expect((await board('cara')).me).toEqual({ rank: null, xp: 0 });
  });

  it('equal XP shares a rank', async () => {
    await as('cara').solve(0); // cara: 10 XP, tied with bob
    const { entries } = await board('cara');
    expect(entries.map((e) => [e.username, e.rank])).toEqual([
      ['ada', 1],
      ['bob', 2],
      ['cara', 2],
    ]);
  });

  it('a made avatar shows on /me and the board; unknown parts are refused (ADR-046)', async () => {
    const made = 's5.grin.braid.black.kurta.sun.round.flower.jhumkas.peach';
    const patch = (avatar: string) =>
      request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', 'Bearer ada')
        .send({ avatar });
    expect((await patch(made).expect(200)).body).toMatchObject({
      avatar: made,
    });
    const { entries } = await board('bob');
    expect(entries.find((e) => e.username === 'ada')?.avatar).toBe(made);
    await patch(made.replace('flower', 'dragon')).expect(400);
    // The old presets are shown but can no longer be picked.
    await patch('a5').expect(400);
  });

  it('?limit caps the entries but me is always filled in', async () => {
    const top1 = (await as('cara').get(
      '/leaderboard/weekly?limit=1',
    )) as WeeklyLeaderboard;
    expect(top1.entries).toHaveLength(1);
    expect(top1.me).toEqual({ rank: 2, xp: 10 });

    await request(app.getHttpServer())
      .get('/leaderboard/weekly?limit=500')
      .set('Authorization', 'Bearer cara')
      .expect(400);
  });

  it('the board resets at Monday 00:00 IST; total XP does not', async () => {
    vi.setSystemTime(ist('2026-10-19T00:00:00'));
    const next = await board('ada');
    expect(next.entries).toEqual([]);
    expect(next.me).toEqual({ rank: null, xp: 0 });
    expect((await me('ada')).xp).toBe(40);
  });

  it('7 days in a row earn a freeze, which then covers a missed day (FR-10)', async () => {
    // Oct 20 to 26: a new lesson every day.
    for (let day = 0; day < 7; day++) {
      vi.setSystemTime(ist(`2026-10-${20 + day}T12:00:00`));
      await as('dan').solve(day);
    }
    expect((await me('dan')).streak).toEqual({
      current: 7,
      longest: 7,
      freezes: 1,
    });

    // Oct 27 missed. On Oct 28 the freeze still covers it: the streak shows.
    vi.setSystemTime(ist('2026-10-28T09:00:00'));
    expect((await me('dan')).streak).toMatchObject({ current: 7, freezes: 1 });

    // A new lesson spends the freeze and the streak carries on.
    await as('dan').solve(7);
    expect((await me('dan')).streak).toEqual({
      current: 8,
      longest: 8,
      freezes: 0,
    });
  });

  it('without a freeze, a missed day restarts the streak', async () => {
    vi.setSystemTime(ist('2026-10-30T09:00:00')); // Oct 29 missed
    expect((await me('dan')).streak.current).toBe(0);
    await as('dan').solve(8);
    expect((await me('dan')).streak).toEqual({
      current: 1,
      longest: 8,
      freezes: 0,
    });
  });
});
