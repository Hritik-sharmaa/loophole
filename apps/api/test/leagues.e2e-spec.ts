import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  LeagueResponse,
  SubmissionResult,
} from '@loophole/shared';
import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import {
  exercises,
  leagueGroups,
  leagueMembers,
} from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { LeaguesService } from '../src/modules/leagues/leagues.service.js';
import {
  CONTENT_DIR,
  createTestDb,
  createTestUser,
  type TestDb,
} from './support/test-db.js';

const user = (n: number, name: string): AuthUser => ({
  id: `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  email: `${name}@example.com`,
  name,
});
const USERS: Record<string, AuthUser> = {
  ada: user(1, 'ada'),
  bob: user(2, 'bob'),
  cara: user(3, 'cara'),
  dan: user(4, 'dan'),
};

// IST wall-clock times. 2026-10-12 and 2026-10-19 are Mondays.
const ist = (dayAndTime: string) => new Date(`${dayAndTime}+05:30`);

// Real HTTP stack + real SQL (PGlite); Supabase and Piston stubbed, the
// clock faked so the test can move from one league week to the next.
describe('Weekly leagues (e2e, ADR-038)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let lessonIds: string[];
  const answers = new Map<string, Map<string, string>>();
  let exerciseOfLesson: Map<string, string>;

  const league = (who: string) =>
    request(app.getHttpServer())
      .get('/leagues/current')
      .set('Authorization', `Bearer ${who}`)
      .expect(200)
      .then((res) => res.body as LeagueResponse);
  const solve = (who: string, lessonIndex: number) => {
    const exerciseId = exerciseOfLesson.get(lessonIds[lessonIndex])!;
    return request(app.getHttpServer())
      .post('/submissions')
      .set('Authorization', `Bearer ${who}`)
      .send({ exerciseId, code: `solve:${exerciseId}` })
      .expect(201)
      .then((res) => res.body as SubmissionResult);
  };
  const solveFirst = async (who: string, lessons: number) => {
    for (let i = 0; i < lessons; i++) await solve(who, i);
  };

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
      const result: RunResult = {
        stdout: answers.get(code.replace('solve:', ''))?.get(stdin) ?? '',
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
    const path = (
      await request(app.getHttpServer())
        .get('/courses/python/path')
        .set('Authorization', 'Bearer ada')
    ).body as CoursePath;
    lessonIds = path.units.flatMap((u) => u.lessons.map((l) => l.id));
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.close();
    await testDb.close();
  });

  it('a learner with no XP this week is not in a league yet', async () => {
    expect(await league('dan')).toMatchObject({
      joined: false,
      tier: { level: 0, name: 'Bronze' },
      members: [],
      lastWeek: null,
      weekStart: ist('2026-10-12T00:00:00').toISOString(),
      endsAt: ist('2026-10-19T00:00:00').toISOString(),
    });
  });

  it('the first XP of the week puts learners in one Bronze group, ranked by XP', async () => {
    await solveFirst('ada', 3); // 30 XP
    await solveFirst('bob', 2); // 20 XP
    await solveFirst('cara', 1); // 10 XP

    const ada = await league('ada');
    expect(ada.joined).toBe(true);
    expect(ada.tier.name).toBe('Bronze');
    // 3 learners: a quarter rounded up moves up; nobody moves down.
    expect(ada.zones).toEqual({ up: 1, down: 0 });
    expect(
      ada.members.map(({ username, xp, rank, zone }) => ({
        username,
        xp,
        rank,
        zone,
      })),
    ).toEqual([
      { username: 'ada', xp: 30, rank: 1, zone: 'up' },
      { username: 'bob', xp: 20, rank: 2, zone: 'stay' },
      { username: 'cara', xp: 10, rank: 3, zone: 'stay' },
    ]);
    // Everyone sees the same group.
    expect((await league('cara')).members).toEqual(ada.members);
    const [{ n }] = await db.select({ n: count() }).from(leagueGroups);
    expect(n).toBe(1);
  });

  it('next week: last week’s winner is headed for Silver before earning anything', async () => {
    vi.setSystemTime(ist('2026-10-20T09:00:00'));
    expect(await league('ada')).toMatchObject({
      joined: false,
      tier: { level: 1, name: 'Silver' },
      lastWeek: { tier: { name: 'Bronze' }, rank: 1, size: 3, zone: 'up' },
    });
  });

  it('their first XP this week places them by last week’s result', async () => {
    await solve('ada', 3);
    await solve('bob', 2);

    const ada = await league('ada');
    expect(ada).toMatchObject({ joined: true, tier: { name: 'Silver' } });
    expect(ada.members.map((m) => m.username)).toEqual(['ada']);

    const bob = await league('bob');
    expect(bob).toMatchObject({
      joined: true,
      tier: { name: 'Bronze' },
      lastWeek: { rank: 2, zone: 'stay' },
    });
    expect(bob.members.map((m) => m.username)).toEqual(['bob']);
  });

  it('a group holds 20: the 21st learner opens a new one', async () => {
    vi.setSystemTime(ist('2026-10-27T09:00:00'));
    const leagues = app.get(LeaguesService);
    for (let n = 100; n < 121; n++) {
      const id = user(n, `l${n}`).id;
      await createTestUser(db, id, `learner${n}`);
      await leagues.join(id);
    }
    const sizes = await db
      .select({ groupId: leagueMembers.groupId, n: count() })
      .from(leagueMembers)
      .where(eq(leagueMembers.weekStart, '2026-10-26'))
      .groupBy(leagueMembers.groupId);
    expect(sizes.map((s) => s.n).sort((a, b) => b - a)).toEqual([20, 1]);
  });
});
