import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  LessonDetail,
  SubmissionResult,
} from '@loophole/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { userProgress } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import { PistonClient } from '../src/integrations/piston.client.js';
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

const USER: AuthUser = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'web@example.com',
  name: 'Web',
};

// ADR-024: the HTML & CSS course, graded by checks on the parsed page. Real
// HTTP stack + real SQL (PGlite) + the real content/ folder; Piston is a
// stub that must never be called for web exercises.
describe('Web exercises (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let lesson: LessonDetail;
  const run = vi.fn<PistonClient['run']>();

  const as = () => ({
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Authorization', 'Bearer web'),
    post: (url: string, body: object) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer web')
        .send(body),
  });

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    await createTestUser(db, USER.id, 'webby');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: () => Promise.resolve(USER) })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const path = (await as().get('/courses/html-css/path').expect(200))
      .body as CoursePath;
    const firstId = path.units[0].lessons[0].id;
    lesson = (await as().get(`/lessons/${firstId}`).expect(200))
      .body as LessonDetail;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('sends the checklist labels and no tests', () => {
    expect(lesson.course).toEqual({
      slug: 'html-css',
      title: 'HTML & CSS',
      language: 'html',
    });
    expect(lesson.exercise.kind).toBe('web');
    expect(lesson.exercise.sampleTests).toEqual([]);
    expect(lesson.exercise.checks).toEqual([
      'There is an `<h1>` heading',
      'The `<h1>` says `Hello, web!`',
    ]);
  });

  it('grades a wrong page check by check, without Piston', async () => {
    const res = await as()
      .post('/submissions', {
        exerciseId: lesson.exercise.id,
        code: '<h1>Hello, world!</h1>',
      })
      .expect(201);
    const body = res.body as SubmissionResult;

    expect(body).toMatchObject({
      status: 'failed',
      testsPassed: 1,
      totalTests: 2,
      lessonCompleted: false,
      xpAwarded: 0,
    });
    expect(body.results).toEqual([
      { kind: 'check', passed: true, label: 'There is an `<h1>` heading' },
      { kind: 'check', passed: false, label: 'The `<h1>` says `Hello, web!`' },
    ]);
    expect(run).not.toHaveBeenCalled();
  });

  it('a passing page completes the lesson, pays XP once, unlocks the next', async () => {
    const pass = () =>
      as().post('/submissions', {
        exerciseId: lesson.exercise.id,
        code: '<h1>Hello, web!</h1>',
      });

    const first = (await pass().expect(201)).body as SubmissionResult;
    expect(first).toMatchObject({
      status: 'passed',
      lessonCompleted: true,
      xpAwarded: 10,
    });
    const again = (await pass().expect(201)).body as SubmissionResult;
    expect(again.xpAwarded).toBe(0);

    const path = (await as().get('/courses/html-css/path').expect(200))
      .body as CoursePath;
    const [l1, l2] = path.units[0].lessons;
    expect([l1.state, l2.state]).toEqual(['completed', 'active']);
    expect(run).not.toHaveBeenCalled();
  });

  it('reports broken CSS in stderr', async () => {
    const path = (await as().get('/courses/html-css/path').expect(200))
      .body as CoursePath;
    // Unlock the CSS unit's first lesson by completing the two units before.
    const cssLesson = path.units[2].lessons[0];
    for (const l of [...path.units[0].lessons, ...path.units[1].lessons]) {
      await db
        .insert(userProgress)
        .values({ userId: USER.id, lessonId: l.id })
        .onConflictDoNothing();
    }
    const detail = (await as().get(`/lessons/${cssLesson.id}`).expect(200))
      .body as LessonDetail;

    const res = await as()
      .post('/submissions', {
        exerciseId: detail.exercise.id,
        code: '<style>h1 { color: orange</style><h1>Welcome</h1>',
      })
      .expect(201);
    const body = res.body as SubmissionResult;
    expect(body.status).toBe('failed');
    expect(body.stderr).toMatch(/^CSS error:/);
  });

  it('POST /runs refuses a web lesson: its examples preview in the browser', async () => {
    const res = await as()
      .post('/runs', { lessonId: lesson.id, code: '<h1>Hi</h1>' })
      .expect(400);
    expect(res.body).toMatchObject({ error: { code: 'NOT_RUNNABLE' } });
    expect(run).not.toHaveBeenCalled();
  });
});
