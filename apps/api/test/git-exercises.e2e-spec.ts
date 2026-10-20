import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  GitRunResponse,
  LessonDetail,
  SubmissionResult,
} from '@loophole/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
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
  id: '88888888-8888-4888-8888-888888888888',
  email: 'git@example.com',
  name: 'Git',
};

// ADR-026: the Git & GitHub course. Commands are replayed on the simulated
// repository; Piston is a stub that must never be called.
describe('Git exercises (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let path: CoursePath;
  let first: LessonDetail;
  const run = vi.fn<PistonClient['run']>();

  const get = (url: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', 'Bearer git');
  const post = (url: string, body: object) =>
    request(app.getHttpServer())
      .post(url)
      .set('Authorization', 'Bearer git')
      .send(body);

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    await createTestUser(db, USER.id, 'gitty');

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

    path = (await get('/courses/git-github/path').expect(200))
      .body as CoursePath;
    first = (await get(`/lessons/${path.units[0].lessons[0].id}`).expect(200))
      .body as LessonDetail;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('sends the checklist labels, and never the hidden setup', () => {
    expect(first.exercise.kind).toBe('git');
    expect(first.course.language).toBe('git');
    expect(first.exercise.checks).toEqual([
      '`user.name` is set',
      '`user.email` is set',
    ]);
    expect(JSON.stringify(first)).not.toContain('@config-reset');
  });

  it('POST /git/run replays the setup, then the commands typed so far', async () => {
    const res = await post('/git/run', {
      lessonId: first.id,
      commands:
        'git config user.name\ngit config --global user.name "Ada"\ngit config user.name',
    }).expect(200);
    const body = res.body as GitRunResponse;
    // The setup reset the identity, so the first read is empty.
    expect(body.transcript).toEqual([
      { command: 'git config user.name', output: '' },
      { command: 'git config --global user.name "Ada"', output: '' },
      { command: 'git config user.name', output: 'Ada' },
    ]);
    expect(body.cwd).toBe('');
  });

  it('a fresh run (a Learn example) skips the setup', async () => {
    const res = await post('/git/run', {
      lessonId: first.id,
      commands: 'git config user.name',
      fresh: true,
    }).expect(200);
    expect((res.body as GitRunResponse).transcript[0].output).toBe('Learner');
  });

  it('grades a submission check by check, pays XP, never calls Piston', async () => {
    const wrong = (
      await post('/submissions', {
        exerciseId: first.exercise.id,
        code: 'git config --global user.name "Ada"',
      }).expect(201)
    ).body as SubmissionResult;
    expect(wrong).toMatchObject({
      status: 'failed',
      testsPassed: 1,
      totalTests: 2,
    });

    const right = (
      await post('/submissions', {
        exerciseId: first.exercise.id,
        code: 'git config --global user.name "Ada"\ngit config --global user.email ada@example.com',
      }).expect(201)
    ).body as SubmissionResult;
    expect(right).toMatchObject({
      status: 'passed',
      lessonCompleted: true,
      xpAwarded: 10,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a locked lesson, a non-git lesson, and /runs for git', async () => {
    const locked = path.units[2].lessons[0].id;
    await post('/git/run', { lessonId: locked, commands: 'ls' }).expect(403);

    const python = (await get('/courses/python/path').expect(200))
      .body as CoursePath;
    const res = await post('/git/run', {
      lessonId: python.units[0].lessons[0].id,
      commands: 'ls',
    }).expect(400);
    expect(res.body).toMatchObject({ error: { code: 'NOT_A_GIT_LESSON' } });

    const runs = await post('/runs', {
      lessonId: first.id,
      code: 'git init',
    }).expect(400);
    expect(runs.body).toMatchObject({ error: { code: 'NOT_RUNNABLE' } });
  });

  it('never lets learner commands use the hidden @-commands', async () => {
    const res = await post('/git/run', {
      lessonId: first.id,
      commands: '@github https://github.com/x/y.git',
    }).expect(200);
    expect((res.body as GitRunResponse).transcript[0].output).toBe(
      '@github: command not found',
    );
  });
});
