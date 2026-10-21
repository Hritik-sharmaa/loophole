import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { DuelHistoryEntry, DuelReplay } from '@loophole/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import {
  duelProblems,
  duelSubmissions,
  duels,
} from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import {
  CONTENT_DIR,
  createTestDb,
  createTestUser,
  type TestDb,
} from './support/test-db.js';

const user = (n: number, name: string): AuthUser => ({
  id: `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  email: `${name}@example.com`,
  name,
});
const USERS: Record<string, AuthUser> = {
  ada: user(1, 'ada'),
  bob: user(2, 'bob'),
  cara: user(3, 'cara'),
};

const START = new Date('2026-10-21T10:00:00Z');
const at = (s: number) => new Date(START.getTime() + s * 1000);

// Real HTTP stack + real SQL (PGlite); finished duels are written straight
// into the tables, so every time in the replay is known.
describe('Duel replays (e2e, FR-27, ADR-041)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  const bodies: unknown[] = [];
  let won: string;
  let drawn: string;
  let running: string;

  const get = async (who: string, url: string, status = 200) => {
    const res = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${who}`)
      .expect(status);
    bodies.push(res.body);
    return res.body as unknown;
  };

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const [name, u] of Object.entries(USERS)) {
      await createTestUser(db, u.id, name);
    }
    const problemId = async (slug: string) =>
      (
        await db
          .select({ id: duelProblems.id })
          .from(duelProblems)
          .where(eq(duelProblems.slug, slug))
      )[0].id;
    const { ada, bob, cara } = USERS;

    // ada beats bob at 1:10 in Python, after a 2/5 at 0:42; bob tried once.
    [{ id: won }] = await db
      .insert(duels)
      .values({
        problemId: await problemId('off-by-one-sum'),
        playerA: ada.id,
        playerB: bob.id,
        status: 'completed',
        result: 'win',
        winnerId: ada.id,
        startedAt: START,
        endsAt: at(300),
        endedAt: at(70),
      })
      .returning({ id: duels.id });
    await db.insert(duelSubmissions).values([
      {
        duelId: won,
        userId: ada.id,
        code: 'ada try',
        testsPassed: 2,
        totalTests: 5,
        submittedAt: at(42),
      },
      {
        duelId: won,
        userId: bob.id,
        code: 'bob secret fix',
        testsPassed: 3,
        totalTests: 5,
        submittedAt: at(55),
      },
      {
        duelId: won,
        userId: ada.id,
        code: 'ada fix',
        testsPassed: 5,
        totalTests: 5,
        submittedAt: at(70),
      },
    ]);

    // bob and ada draw a JavaScript duel later, with no submissions.
    [{ id: drawn }] = await db
      .insert(duels)
      .values({
        problemId: await problemId('js-factorial'),
        playerA: bob.id,
        playerB: ada.id,
        status: 'completed',
        result: 'draw',
        winnerId: null,
        startedAt: at(1000),
        endsAt: at(1300),
        endedAt: at(1300),
      })
      .returning({ id: duels.id });

    // ada vs cara, still running.
    [{ id: running }] = await db
      .insert(duels)
      .values({
        problemId: await problemId('fizzbuzz'),
        playerA: ada.id,
        playerB: cara.id,
        status: 'in_progress',
        // Real times: on start the API finishes overdue duels.
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 300_000),
      })
      .returning({ id: duels.id });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: (token: string) => Promise.resolve(USERS[token]) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('lists the caller’s finished duels, newest first, from their side', async () => {
    const ada = (await get('ada', '/duels/history')) as DuelHistoryEntry[];
    expect(ada.map((d) => d.id)).toEqual([drawn, won]);
    expect(ada[0]).toMatchObject({
      title: 'Factorial',
      language: 'javascript',
      opponent: 'bob',
      outcome: 'draw',
      result: 'draw',
      myBest: 0,
      opponentBest: 0,
    });
    expect(ada[1]).toMatchObject({
      title: 'Sum to N',
      language: 'python',
      opponent: 'bob',
      outcome: 'won',
      result: 'win',
      myBest: 5,
      opponentBest: 3,
      totalTests: 5,
      endedAt: at(70).toISOString(),
    });

    const bob = (await get('bob', '/duels/history')) as DuelHistoryEntry[];
    expect(bob[1]).toMatchObject({
      outcome: 'lost',
      myBest: 3,
      opponentBest: 5,
    });
    expect(await get('cara', '/duels/history')).toEqual([]);
  });

  it('replays a duel: the caller’s code at each attempt, only the opponent’s scores', async () => {
    const replay = (await get('ada', `/duels/${won}/replay`)) as DuelReplay;
    expect(replay).toMatchObject({
      id: won,
      opponent: 'bob',
      outcome: 'won',
      result: 'win',
      durationMs: 70_000,
      totalTests: 5,
      problem: { title: 'Sum to N', language: 'python' },
    });
    expect(replay.problem.buggyCode).toContain('range(1, n)');
    expect(replay.events).toEqual([
      {
        atMs: 42_000,
        who: 'me',
        testsPassed: 2,
        totalTests: 5,
        code: 'ada try',
      },
      {
        atMs: 55_000,
        who: 'opponent',
        testsPassed: 3,
        totalTests: 5,
        code: null,
      },
      {
        atMs: 70_000,
        who: 'me',
        testsPassed: 5,
        totalTests: 5,
        code: 'ada fix',
      },
    ]);

    // From bob's side: his own code, never ada's winning fix.
    const bobs = (await get('bob', `/duels/${won}/replay`)) as DuelReplay;
    expect(bobs.outcome).toBe('lost');
    expect(bobs.events.map((e) => e.code)).toEqual([
      null,
      'bob secret fix',
      null,
    ]);
    expect(JSON.stringify(bobs)).not.toContain('ada fix');
  });

  it('a duel with no attempts replays as just its length', async () => {
    const replay = (await get('ada', `/duels/${drawn}/replay`)) as DuelReplay;
    expect(replay).toMatchObject({
      outcome: 'draw',
      durationMs: 300_000,
      events: [],
      problem: { language: 'javascript' },
    });
  });

  it('only players can see a replay, and only once the duel is over', async () => {
    await get('cara', `/duels/${won}/replay`, 404);
    await get('ada', `/duels/${running}/replay`, 409);
    await get('ada', '/duels/not-a-uuid/replay', 400);
    await get('ada', '/duels/00000000-0000-4000-8000-000000000000/replay', 404);
  });

  // AGENTS.md hard rule 2: hidden tests never leave the server.
  it('no response contains hidden tests', () => {
    for (const body of bodies) {
      expect(JSON.stringify(body)).not.toMatch(/hidden_?tests/i);
    }
  });
});
