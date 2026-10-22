import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  LessonDetail,
  MeResponse,
  SubmissionResult,
} from '@loophole/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { exercises } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
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

const ADA: AuthUser = {
  id: 'f1111111-1111-4111-8111-111111111111',
  email: 'ada@example.com',
  name: 'ada',
};

// Real HTTP stack + real SQL (PGlite) + the real Python course with its
// checkpoint projects (ADR-043). Supabase is stubbed; Piston answers
// "solve:<exerciseId>" correctly and everything else wrongly.
describe('Checkpoint projects (e2e, ADR-043)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  const answers = new Map<string, Map<string, string>>();

  const http = () => request(app.getHttpServer());
  const get = <T>(url: string) =>
    http()
      .get(url)
      .set('Authorization', 'Bearer ada')
      .expect(200)
      .then((res) => res.body as T);
  const path = () => get<CoursePath>('/courses/python/path');
  const submit = (exerciseId: string, code = `solve:${exerciseId}`) =>
    http()
      .post('/submissions')
      .set('Authorization', 'Bearer ada')
      .send({ exerciseId, code })
      .expect(201)
      .then((res) => res.body as SubmissionResult);
  const solveLesson = async (lessonId: string) => {
    const lesson = await get<LessonDetail>(`/lessons/${lessonId}`);
    return submit(lesson.exercise.id);
  };

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    await createTestUser(db, ADA.id, 'ada');
    for (const e of await db.select().from(exercises)) {
      const tests = [...e.sampleTests, ...e.hiddenTests];
      answers.set(e.id, new Map(tests.map((t) => [t.input, t.expectedOutput])));
    }
    const run = (_lang: string, code: string, stdin: string) => {
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
      .useValue({
        verify: (token: string) =>
          Promise.resolve(token === 'ada' ? ADA : null),
      })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('each unit ends with its project, locked at first', async () => {
    const { units } = await path();
    for (const unit of units) {
      expect(unit.lessons.at(-1)?.project).toBe(true);
      expect(unit.lessons.filter((l) => l.project)).toHaveLength(1);
    }
    expect(units[0].lessons.at(-1)).toMatchObject({
      title: 'Project: Samosa party',
      state: 'locked',
    });
  });

  it('finishing a unit opens its project and the next unit together', async () => {
    const unit1 = (await path()).units[0].lessons;
    for (const lesson of unit1.filter((l) => !l.project)) {
      await solveLesson(lesson.id);
    }
    const { units } = await path();
    expect(units[0].lessons.at(-1)?.state).toBe('active');
    expect(units[1].lessons[0].state).toBe('active');
  });

  it('the project has no Learn step, a step-by-step task and its Hinglish', async () => {
    const id = (await path()).units[0].lessons.at(-1)!.id;
    const project = await get<LessonDetail>(`/lessons/${id}`);
    expect(project).toMatchObject({ project: true, learn: null });
    expect(project.exercise.prompt.split('\n')).toHaveLength(4);
    expect(project.exercise.sampleTests).toEqual([
      { input: '4\n3\n', expectedOutput: 'Samosas: 12\nPacks: 2\nSpare: 0' },
    ]);
    await http()
      .patch('/me')
      .set('Authorization', 'Bearer ada')
      .send({ lessonLanguage: 'hinglish' })
      .expect(200);
    const hi = await get<LessonDetail>(`/lessons/${id}`);
    expect(hi.exercise.prompt).toContain('Party ke snacks plan karo.');
  });

  it('skipping the project doesn’t hold back the next unit', async () => {
    const unit2 = (await path()).units[1].lessons;
    const result = await solveLesson(unit2[0].id);
    expect(result.status).toBe('passed');
    expect((await path()).units[1].lessons[1].state).toBe('active');
  });

  it('a passing project pays 30 XP, once', async () => {
    const id = (await path()).units[0].lessons.at(-1)!.id;
    const project = await get<LessonDetail>(`/lessons/${id}`);
    const before = (await get<MeResponse>('/me')).xp;

    const wrong = await submit(project.exercise.id, 'print("Samosas: 1")');
    expect(wrong).toMatchObject({ status: 'failed', xpAwarded: 0 });
    const right = await submit(project.exercise.id);
    expect(right).toMatchObject({
      status: 'passed',
      lessonCompleted: true,
      xpAwarded: 30,
    });
    expect((await get<MeResponse>('/me')).xp).toBe(before + 30);
    expect((await submit(project.exercise.id)).xpAwarded).toBe(0);
    expect((await path()).units[0].lessons.at(-1)?.state).toBe('completed');
  });
});
