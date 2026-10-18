import { BadGatewayException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  SubmissionResult,
  SubmissionSummary,
} from '@loophole/shared';
import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import {
  exercises,
  profiles,
  submissions,
  userProgress,
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
import { CONTENT_DIR, createTestDb, type TestDb } from './support/test-db.js';

// One user per concern, because the throttle counts per user.
const USERS: Record<string, AuthUser> = {
  learner: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'learner@example.com',
    name: 'Learner',
  },
  edge: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'edge@example.com',
    name: 'Edge',
  },
  spammer: {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'spam@example.com',
    name: 'Spammer',
  },
};

// Stand-in "programs": the fake Piston looks the code up here instead of
// running Python.
const ok = (stdout: string): RunResult => ({
  stdout,
  stderr: '',
  exitCode: 0,
  timedOut: false,
});
const PROGRAMS: Record<string, (stdin: string) => RunResult> = {
  hello: () => ok('Hello, Loophole!\n'),
  wrong: () => ok('Hello, world\n'),
  // Crashes with a message that quotes its input, like a real traceback.
  quotesInput: (stdin) => ({
    stdout: '',
    stderr: `ValueError: bad name '${stdin.trim()}'`,
    exitCode: 1,
    timedOut: false,
  }),
  hangs: () => ({ stdout: '', stderr: '', exitCode: null, timedOut: true }),
};

// Real HTTP stack + real SQL (PGlite) + the real content/ folder.
// Supabase token checks and Piston are stubbed.
describe('Submissions (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let lessonIds: string[];
  let exerciseIdOf: Map<string, string>;
  const run = vi.fn<PistonClient['run']>();

  const submit = (who: string, body: object) =>
    request(app.getHttpServer())
      .post('/submissions')
      .set('Authorization', `Bearer ${who}`)
      .send(body);

  const getAs = (who: string, url: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${who}`);

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    // Supabase users exist, but no profiles yet: submitting must create one.
    for (const { id } of Object.values(USERS)) {
      await db.execute(`insert into auth.users (id) values ('${id}')`);
    }

    run.mockImplementation((_language, code, stdin) => {
      const program = PROGRAMS[code];
      return Promise.resolve(program ? program(stdin) : ok(''));
    });

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

    const path = (await getAs('learner', '/courses/python/path'))
      .body as CoursePath;
    lessonIds = path.units.flatMap((u) => u.lessons.map((l) => l.id));
    const rows = await db
      .select({ id: exercises.id, lessonId: exercises.lessonId })
      .from(exercises);
    exerciseIdOf = new Map(rows.map((r) => [r.lessonId, r.id]));
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  const exerciseOf = (lessonIndex: number) =>
    exerciseIdOf.get(lessonIds[lessonIndex])!;

  const statesFor = async (who: string) => {
    const path = (await getAs(who, '/courses/python/path')).body as CoursePath;
    return path.units.flatMap((u) => u.lessons.map((l) => l.state));
  };

  it('a locked lesson returns 403 and runs nothing', async () => {
    run.mockClear();
    const res = await submit('learner', {
      exerciseId: exerciseOf(1),
      code: 'hello',
    }).expect(403);

    expect(res.body).toMatchObject({ error: { code: 'LESSON_LOCKED' } });
    expect(run).not.toHaveBeenCalled();
  });

  it('wrong output fails, shows sample details, and unlocks nothing', async () => {
    const res = await submit('learner', {
      exerciseId: exerciseOf(0),
      code: 'wrong',
    }).expect(201);
    const body = res.body as SubmissionResult;

    expect(body).toMatchObject({
      status: 'failed',
      testsPassed: 0,
      totalTests: 4,
      lessonCompleted: false,
      xpAwarded: 0,
      stderr: '',
    });
    expect(body.results[0]).toEqual({
      kind: 'sample',
      passed: false,
      input: '',
      expected: 'Hello, Loophole!',
      actual: 'Hello, world',
    });
    expect(body.results.slice(1)).toEqual([
      { kind: 'hidden', passed: false },
      { kind: 'hidden', passed: false },
      { kind: 'hidden', passed: false },
    ]);
    expect((await statesFor('learner')).slice(0, 2)).toEqual([
      'active',
      'locked',
    ]);
  });

  it('created the profile on the first submission', async () => {
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, USERS.learner.id));
    expect(row?.username).toBe('learner');
  });

  it('runs every test with the exercise language and the test input', async () => {
    run.mockClear();
    await submit('learner', { exerciseId: exerciseOf(0), code: 'wrong' });

    expect(run).toHaveBeenCalledTimes(4);
    expect(run.mock.calls.map(([lang, , stdin]) => [lang, stdin])).toEqual([
      ['python', ''],
      ['python', ''],
      ['python', '\n'],
      ['python', 'ignored\n'],
    ]);
  });

  it('a full pass completes the lesson and unlocks the next one (J-1)', async () => {
    const res = await submit('learner', {
      exerciseId: exerciseOf(0),
      code: 'hello',
    }).expect(201);

    expect(res.body).toMatchObject({
      status: 'passed',
      testsPassed: 4,
      totalTests: 4,
      lessonCompleted: true,
    });
    expect((await statesFor('learner')).slice(0, 3)).toEqual([
      'completed',
      'active',
      'locked',
    ]);
  });

  it('passing again keeps one progress row (idempotent)', async () => {
    await submit('learner', { exerciseId: exerciseOf(0), code: 'hello' })
      .expect(201)
      .expect((res) => expect(res.body).toMatchObject({ status: 'passed' }));

    const [{ n }] = await db
      .select({ n: count() })
      .from(userProgress)
      .where(eq(userProgress.userId, USERS.learner.id));
    expect(n).toBe(1);
  });

  // AGENTS.md hard rule 2, for a program whose errors quote its input.
  it('never reveals hidden test inputs or outputs', async () => {
    const exerciseId = exerciseOf(1);
    const res = await submit('learner', {
      exerciseId,
      code: 'quotesInput',
    }).expect(201);
    const body = res.body as SubmissionResult;

    expect(body.status).toBe('error');
    // The sample test's own error is fine to show.
    expect(body.stderr).toBe("ValueError: bad name 'Ada'");

    const [{ hiddenTests }] = await db
      .select({ hiddenTests: exercises.hiddenTests })
      .from(exercises)
      .where(eq(exercises.id, exerciseId));
    const text = JSON.stringify(body);
    for (const t of hiddenTests) {
      expect(text).not.toContain(t.input.trim());
      expect(text).not.toContain(t.expectedOutput);
    }
    expect(text).not.toMatch(/hidden_?tests/i);
  });

  it('GET /submissions lists the user’s own attempts, newest first', async () => {
    const res = await getAs(
      'learner',
      `/submissions?exerciseId=${exerciseOf(0)}`,
    ).expect(200);
    const list = res.body as SubmissionSummary[];

    expect(list.map((s) => [s.status, s.code])).toEqual([
      ['passed', 'hello'],
      ['passed', 'hello'],
      ['failed', 'wrong'],
      ['failed', 'wrong'],
    ]);
    expect(JSON.stringify(list)).not.toMatch(/hidden_?tests/i);

    const other = await getAs(
      'edge',
      `/submissions?exerciseId=${exerciseOf(0)}`,
    ).expect(200);
    expect(other.body).toEqual([]);
  });

  it.each([
    ['sends its own test cases', { hiddenTests: [] }],
    ['has a malformed exercise id', { exerciseId: 'nope' }],
    ['has code over 20 KB', { code: 'x'.repeat(20 * 1024 + 1) }],
    ['has no code', { code: undefined }],
  ])('400 when the body %s', async (_case, patch) => {
    const res = await submit('edge', {
      exerciseId: exerciseOf(0),
      code: 'hello',
      ...patch,
    }).expect(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('404 for an unknown exercise', async () => {
    const res = await submit('edge', {
      exerciseId: '00000000-0000-4000-8000-000000000000',
      code: 'hello',
    }).expect(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('502 EXECUTOR_UNAVAILABLE when Piston is down, and nothing is saved', async () => {
    run.mockRejectedValueOnce(
      new BadGatewayException({
        code: 'EXECUTOR_UNAVAILABLE',
        message: 'down',
      }),
    );
    const res = await submit('edge', {
      exerciseId: exerciseOf(0),
      code: 'hello',
    }).expect(502);

    expect(res.body).toMatchObject({ error: { code: 'EXECUTOR_UNAVAILABLE' } });
    const [{ n }] = await db
      .select({ n: count() })
      .from(submissions)
      .where(eq(submissions.userId, USERS.edge.id));
    expect(n).toBe(0);
  });

  it('stops running tests after the first time-out', async () => {
    run.mockClear();
    const res = await submit('edge', {
      exerciseId: exerciseOf(0),
      code: 'hangs',
    }).expect(201);

    expect(run).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      status: 'error',
      testsPassed: 0,
      totalTests: 4,
    });
    expect((res.body as SubmissionResult).stderr).toMatch(/3 seconds/);
  });

  it('the 11th submission in a minute returns 429 RATE_LIMITED (NFR-06)', async () => {
    for (let i = 0; i < 10; i++) {
      await submit('spammer', {
        exerciseId: exerciseOf(0),
        code: 'wrong',
      }).expect(201);
    }
    const res = await submit('spammer', {
      exerciseId: exerciseOf(0),
      code: 'wrong',
    }).expect(429);
    expect(res.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });

    // Other users are not affected.
    await submit('edge', { exerciseId: exerciseOf(0), code: 'wrong' }).expect(
      201,
    );
  });
});
