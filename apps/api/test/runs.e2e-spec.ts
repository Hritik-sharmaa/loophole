import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { CoursePath, RunResponse } from '@loophole/shared';
import { count } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { submissions, xpEvents } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import { PistonClient } from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { TIMEOUT_MESSAGE } from '../src/modules/submissions/grading.js';
import {
  CONTENT_DIR,
  createTestDb,
  createTestUser,
  type TestDb,
} from './support/test-db.js';

// One user per concern, because the throttle counts per user.
const USERS: Record<string, AuthUser> = {
  learner: {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'runner@example.com',
    name: 'Runner',
  },
  spammer: {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'spam-runs@example.com',
    name: 'Spammer',
  },
};

// POST /runs (ADR-021): ungraded runs for Learn examples. Real HTTP stack +
// real SQL (PGlite) + the real content/ folder; Supabase and Piston stubbed.
describe('Runs (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let lessonIds: string[];
  const run = vi.fn<PistonClient['run']>();

  const post = (who: string, body: object) =>
    request(app.getHttpServer())
      .post('/runs')
      .set('Authorization', `Bearer ${who}`)
      .send(body);

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const [name, { id }] of Object.entries(USERS)) {
      await createTestUser(db, id, name);
    }

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

    const path = (
      await request(app.getHttpServer())
        .get('/courses/python/path')
        .set('Authorization', 'Bearer learner')
    ).body as CoursePath;
    lessonIds = path.units.flatMap((u) => u.lessons.map((l) => l.id));
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  beforeEach(() => run.mockReset());

  it('runs the code with its input in the course language', async () => {
    run.mockResolvedValue({
      stdout: 'Ada\n',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    const res = await post('learner', {
      lessonId: lessonIds[0],
      code: 'name = input()\nprint(name)\n',
      input: 'Ada\n',
    }).expect(200);

    expect(res.body as RunResponse).toEqual({
      stdout: 'Ada\n',
      stderr: '',
      timedOut: false,
    });
    expect(run).toHaveBeenCalledWith(
      'python',
      'name = input()\nprint(name)\n',
      'Ada\n',
    );
  });

  it('explains a time-out when the program printed no error', async () => {
    run.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: true,
    });
    const res = await post('learner', {
      lessonId: lessonIds[0],
      code: 'while True: pass\n',
    }).expect(200);
    expect(res.body).toMatchObject({ timedOut: true, stderr: TIMEOUT_MESSAGE });
  });

  it('stores nothing and pays no XP', async () => {
    run.mockResolvedValue({
      stdout: 'Hello, Loophole!\n',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    await post('learner', {
      lessonId: lessonIds[0],
      code: 'print("Hello, Loophole!")\n',
    }).expect(200);
    const [{ n: subs }] = await db.select({ n: count() }).from(submissions);
    const [{ n: xp }] = await db.select({ n: count() }).from(xpEvents);
    expect([subs, xp]).toEqual([0, 0]);
  });

  it('returns 403 for a locked lesson and runs nothing', async () => {
    const res = await post('learner', {
      lessonId: lessonIds[5],
      code: 'print(1)\n',
    }).expect(403);
    expect(res.body).toMatchObject({ error: { code: 'LESSON_LOCKED' } });
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects a client-chosen language and an unknown lesson', async () => {
    await post('learner', {
      lessonId: lessonIds[0],
      code: 'print(1)\n',
      language: 'bash',
    }).expect(400);
    await post('learner', {
      lessonId: '00000000-0000-4000-8000-000000000000',
      code: 'print(1)\n',
    }).expect(404);
    expect(run).not.toHaveBeenCalled();
  });

  it('throttles at 10 runs a minute', async () => {
    run.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    const body = { lessonId: lessonIds[0], code: 'pass\n' };
    for (let i = 0; i < 10; i++) await post('spammer', body).expect(200);
    const res = await post('spammer', body).expect(429);
    expect(res.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });
});
