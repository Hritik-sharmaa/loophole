import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CourseOverview,
  CoursePath,
  LessonDetail,
} from '@loophole/shared';
import { count } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import {
  exercises,
  lessons,
  units,
  userProgress,
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

const USER: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'learner@example.com',
  name: 'Learner',
};

// Real HTTP stack + real SQL (PGlite) + the real content/ folder.
// Only Supabase token checks are stubbed.
describe('Lessons (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let path: CoursePath;
  // Every response body from these tests, checked for leaks at the end.
  const bodies: unknown[] = [];

  const get = async (url: string, status: number) => {
    const res = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', 'Bearer test-token')
      .expect(status);
    bodies.push(res.body);
    return res.body as unknown;
  };

  const lessonIds = () => path.units.flatMap((u) => u.lessons.map((l) => l.id));

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    await createTestUser(db, USER.id);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: () => Promise.resolve(USER) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('GET /courses lists every course with no progress yet, by title', async () => {
    const body = (await get('/courses', 200)) as CourseOverview[];
    expect(body).toEqual([
      expect.objectContaining({
        slug: 'html-css',
        language: 'html',
        lessonCount: 15,
        completedCount: 0,
        lastActivityAt: null,
      }),
      expect.objectContaining({
        slug: 'javascript',
        language: 'javascript',
        lessonCount: 20,
        completedCount: 0,
        lastActivityAt: null,
      }),
      expect.objectContaining({
        slug: 'python',
        language: 'python',
        lessonCount: 40,
        completedCount: 0,
        lastActivityAt: null,
      }),
    ]);
    expect(body[2].description).toContain('40 bite-sized lessons');
  });

  it('a new user has lesson 1 active and every other lesson locked', async () => {
    path = (await get('/courses/python/path', 200)) as CoursePath;

    expect(path.units.map((u) => u.title)).toEqual([
      'The basics',
      'Making decisions',
      'Loops',
      'Working with text',
      'Lists',
      'Functions',
      'Dictionaries',
    ]);
    const states = path.units.flatMap((u) => u.lessons.map((l) => l.state));
    expect(states).toHaveLength(40);
    expect(states[0]).toBe('active');
    expect(states.slice(1).every((s) => s === 'locked')).toBe(true);
    expect(path.units[0].lessons[0].title).toBe('Hello, world');
  });

  it('GET /lessons/:id returns the active lesson with sample tests', async () => {
    const [first] = lessonIds();
    const body = (await get(`/lessons/${first}`, 200)) as LessonDetail;

    expect(body.title).toBe('Hello, world');
    expect(body.course).toEqual({
      slug: 'python',
      title: 'Python Basics',
      language: 'python',
    });
    expect(body.exercise.prompt).toContain('Hello, Loophole!');
    expect(body.exercise.sampleTests).toEqual([
      { input: '', expectedOutput: 'Hello, Loophole!' },
    ]);
    // ADR-021: the Learn step comes with the lesson.
    expect(body.learn?.cards[0]).toMatchObject({
      title: 'Your first line of Python',
      code: 'print("Hello!")\n',
      output: 'Hello!',
    });
    expect(body.learn?.check.options[body.learn.check.answer]).toBe(
      'Hi, there!',
    );
  });

  it('GET /lessons/:id returns 403 LESSON_LOCKED for a locked lesson', async () => {
    const locked = lessonIds()[3];
    const body = await get(`/lessons/${locked}`, 403);
    expect(body).toMatchObject({ error: { code: 'LESSON_LOCKED' } });
  });

  it('completing lesson 1 unlocks lesson 2', async () => {
    const [first, second] = lessonIds();
    await db.insert(userProgress).values({ userId: USER.id, lessonId: first });

    const next = (await get('/courses/python/path', 200)) as CoursePath;
    const [l1, l2, l3] = next.units[0].lessons;
    expect([l1.state, l2.state, l3.state]).toEqual([
      'completed',
      'active',
      'locked',
    ]);
    await get(`/lessons/${first}`, 200); // completed lessons stay open
    await get(`/lessons/${second}`, 200);

    // The catalog counts it, with when it happened (ADR-023).
    const [python] = (await get('/courses', 200)) as CourseOverview[];
    expect(python.completedCount).toBe(1);
    expect(python.lastActivityAt).not.toBeNull();
  });

  it('returns 404 for an unknown lesson or course, 400 for a bad id', async () => {
    const missing = await get(
      '/lessons/00000000-0000-4000-8000-000000000000',
      404,
    );
    expect(missing).toMatchObject({ error: { code: 'NOT_FOUND' } });
    await get('/courses/nope/path', 404);
    const bad = await get('/lessons/not-a-uuid', 400);
    expect(bad).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('seeding again changes nothing (idempotent)', async () => {
    const counts = async () => ({
      units: (await db.select({ n: count() }).from(units))[0].n,
      lessons: (await db.select({ n: count() }).from(lessons))[0].n,
      exercises: (await db.select({ n: count() }).from(exercises))[0].n,
    });
    const before = await counts();
    const summary = await seedContent(db, CONTENT_DIR);

    expect(await counts()).toEqual(before);
    // Python 7 units / 40 lessons, HTML & CSS 3 / 15, JavaScript 5 / 20.
    expect(before).toEqual({ units: 15, lessons: 75, exercises: 75 });
    expect(summary.stale).toEqual([]);
    // Progress survives a re-seed because lesson ids are kept.
    const [{ n }] = await db.select({ n: count() }).from(userProgress);
    expect(n).toBe(1);
  });

  // AGENTS.md hard rule 2: hidden tests never leave the server.
  it('no response contains hidden tests', () => {
    expect(bodies.length).toBeGreaterThan(5);
    for (const body of bodies) {
      expect(findKeys(body, /hidden_?tests/i)).toEqual([]);
    }
  });
});

// Every object key (at any depth) whose name matches the pattern.
function findKeys(value: unknown, pattern: RegExp): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => findKeys(v, pattern));
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, v]) => [
    ...(pattern.test(key) ? [key] : []),
    ...findKeys(v, pattern),
  ]);
}
