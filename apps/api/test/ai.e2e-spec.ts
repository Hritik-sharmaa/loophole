import { BadGatewayException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  ExplainCardResponse,
  ExplainResponse,
  HintResponse,
  SubmissionResult,
} from '@loophole/shared';
import { and, eq } from 'drizzle-orm';
import { istDate } from '../src/common/ist-calendar.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { aiUsage, exercises } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  GeminiClient,
  type CardInput,
  type ExplainInput,
  type HintInput,
} from '../src/integrations/gemini.client.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import {
  GENERIC_EXPLANATION,
  GENERIC_HINT,
} from '../src/modules/ai/tutor-guards.js';
import { CONTENT_DIR, createTestDb, type TestDb } from './support/test-db.js';

const USERS: Record<string, AuthUser> = {
  learner: {
    id: '88888888-8888-4888-8888-888888888888',
    email: 'learner@example.com',
    name: 'Learner',
  },
  burst: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'burst@example.com',
    name: 'Burst',
  },
  other: {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'other@example.com',
    name: 'Other',
  },
  // Its own throttle and cap, for the explain-card tests (ADR-036).
  reader: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email: 'reader@example.com',
    name: 'Reader',
  },
};

// Every program "prints" this and complains on stderr, so it fails.
const wrongRun: RunResult = {
  stdout: 'Hello, world\n',
  stderr: 'Warning: something odd on line 1',
  exitCode: 0,
  timedOut: false,
};

// Real HTTP stack + real SQL (PGlite). Supabase, Piston and Gemini are
// stubbed; no test calls Gemini (docs/AI_TUTOR.md §2).
describe('AI tutor (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let lessonIds: string[];
  let exerciseOfLesson: Map<string, string>;
  let failedSubmission: SubmissionResult;
  const explainError =
    vi.fn<
      (
        input: ExplainInput,
      ) => Promise<{ explanation: string; line: number | null }>
    >();
  const giveHint = vi.fn<(input: HintInput) => Promise<{ hint: string }>>();
  const explainCard =
    vi.fn<(input: CardInput) => Promise<{ explanation: string }>>();

  const post = (who: string, url: string, body: object) =>
    request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${who}`)
      .send(body);
  const exerciseOf = (lessonIndex: number) =>
    exerciseOfLesson.get(lessonIds[lessonIndex])!;
  const hint = (who: string, lessonIndex = 0) =>
    post(who, '/ai/hint', {
      exerciseId: exerciseOf(lessonIndex),
      code: 'x = 1',
    });

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const { id } of Object.values(USERS)) {
      await db.execute(`insert into auth.users (id) values ('${id}')`);
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: (token: string) => Promise.resolve(USERS[token]) })
      .overrideProvider(PistonClient)
      .useValue({ run: () => Promise.resolve(wrongRun) })
      .overrideProvider(GeminiClient)
      .useValue({ explainError, giveHint, explainCard })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const path = (
      await request(app.getHttpServer())
        .get('/courses/python/path')
        .set('Authorization', 'Bearer learner')
    ).body as CoursePath;
    lessonIds = path.units.flatMap((u) => u.lessons.map((l) => l.id));
    const rows = await db
      .select({ id: exercises.id, lessonId: exercises.lessonId })
      .from(exercises);
    exerciseOfLesson = new Map(rows.map((r) => [r.lessonId, r.id]));

    failedSubmission = (
      await post('learner', '/submissions', {
        exerciseId: exerciseOf(0),
        code: 'print("Hello, world")',
      }).expect(201)
    ).body as SubmissionResult;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  beforeEach(() => {
    explainError.mockReset();
    giveHint.mockReset();
    explainCard.mockReset();
  });

  it('explain sends only what the learner saw, and points at a line (J-2)', async () => {
    explainError.mockResolvedValue({
      explanation: 'You print the wrong greeting.',
      line: 1,
    });

    const res = await post('learner', '/ai/explain', {
      submissionId: failedSubmission.id,
    }).expect(200);

    expect(res.body).toEqual({
      explanation: 'You print the wrong greeting.',
      line: 1,
      remainingToday: 19,
    });
    expect(explainError).toHaveBeenCalledWith({
      language: 'python',
      exercisePrompt: expect.stringContaining('Hello, Loophole!') as string,
      code: 'print("Hello, world")',
      failingTest: {
        input: '',
        expectedOutput: 'Hello, Loophole!',
        actualOutput: 'Hello, world',
      },
      stderr: 'Warning: something odd on line 1',
    });
  });

  it('an explanation that writes out the fix is replaced', async () => {
    explainError.mockResolvedValue({
      explanation:
        'Use this:\na = int(input())\nb = int(input())\nc = a + b\nprint(c)',
      line: 2,
    });
    const res = await post('learner', '/ai/explain', {
      submissionId: failedSubmission.id,
    }).expect(200);
    expect(res.body).toMatchObject({
      explanation: GENERIC_EXPLANATION,
      line: null,
    });
  });

  // AGENTS.md hard rule 2: hidden tests never reach Gemini either.
  it('never sends hidden test data to the tutor', async () => {
    explainError.mockResolvedValue({ explanation: 'ok', line: null });
    await post('learner', '/ai/explain', {
      submissionId: failedSubmission.id,
    }).expect(200);

    const [{ hiddenTests }] = await db
      .select({ hiddenTests: exercises.hiddenTests })
      .from(exercises)
      .where(eq(exercises.id, exerciseOf(0)));
    const sent = JSON.stringify(explainError.mock.calls);
    // "ignored" is the only hidden input not also a sample input.
    expect(hiddenTests.some((t) => t.input === 'ignored\n')).toBe(true);
    expect(sent).not.toContain('ignored');
  });

  it('cuts long explanations to 120 words and drops a bad line number', async () => {
    explainError.mockResolvedValue({
      explanation: Array.from({ length: 200 }, () => 'word').join(' '),
      line: 99,
    });
    const body = (
      await post('learner', '/ai/explain', {
        submissionId: failedSubmission.id,
      }).expect(200)
    ).body as ExplainResponse;

    expect(body.explanation.split(' ')).toHaveLength(120);
    expect(body.line).toBeNull();
  });

  it('someone else’s submission is 404, and is not counted', async () => {
    const res = await post('other', '/ai/explain', {
      submissionId: failedSubmission.id,
    }).expect(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(explainError).not.toHaveBeenCalled();
  });

  it('hint sends the current code and returns the nudge (FR-13)', async () => {
    giveHint.mockResolvedValue({
      hint: 'What exact text does the task ask for?',
    });

    const body = (await hint('other').expect(200)).body as HintResponse;

    expect(body).toEqual({
      hint: 'What exact text does the task ask for?',
      remainingToday: 19,
    });
    expect(giveHint).toHaveBeenCalledWith({
      language: 'python',
      exercisePrompt: expect.stringContaining('Hello, Loophole!') as string,
      code: 'x = 1',
    });
  });

  it('a hint that gives the code away is replaced', async () => {
    giveHint.mockResolvedValue({
      hint: 'Do this:\na = int(input())\nb = int(input())\nc = a + b\nprint(c)',
    });
    const body = (await hint('other').expect(200)).body as HintResponse;
    expect(body.hint).toBe(GENERIC_HINT);
  });

  it('hint for a locked lesson is 403, and is not counted', async () => {
    const res = await hint('other', 3).expect(403);
    expect(res.body).toMatchObject({ error: { code: 'LESSON_LOCKED' } });
    expect(giveHint).not.toHaveBeenCalled();
  });

  it('502 AI_UNAVAILABLE when Gemini fails, and the request is given back', async () => {
    giveHint.mockRejectedValueOnce(
      new BadGatewayException({ code: 'AI_UNAVAILABLE', message: 'down' }),
    );
    const failed = await hint('other').expect(502);
    expect(failed.body).toMatchObject({ error: { code: 'AI_UNAVAILABLE' } });

    // other has used 2 so far; the failed one did not count.
    giveHint.mockResolvedValue({ hint: 'ok' });
    const next = (await hint('other').expect(200)).body as HintResponse;
    expect(next.remainingToday).toBe(17);
  });

  it('rejects a bad body with 400', async () => {
    await post('other', '/ai/hint', { exerciseId: 'nope', code: '' }).expect(
      400,
    );
    await post('other', '/ai/explain', { submissionId: 'nope' }).expect(400);
  });

  it('explain-card sends the card as stored, not anything from the browser (ADR-036)', async () => {
    explainCard.mockResolvedValue({
      explanation: 'Think of print() as a loudspeaker for your program.',
    });
    const res = await post('reader', '/ai/explain-card', {
      lessonId: lessonIds[0],
      card: 0,
    }).expect(200);
    const body = res.body as ExplainCardResponse;

    expect(body.explanation).toContain('loudspeaker');
    expect(body.remainingToday).toBe(19);
    expect(explainCard).toHaveBeenCalledWith({
      language: 'python',
      lessonTitle: 'Hello, world',
      title: 'Your first line of Python',
      body: expect.stringContaining('print()') as string,
      code: 'print("Hello!")\n',
    });
  });

  it('explain-card refuses a bug card, a missing card and a locked lesson, uncounted', async () => {
    // Hello, world: three teaching cards, then its spot-the-bug card.
    await post('reader', '/ai/explain-card', {
      lessonId: lessonIds[0],
      card: 3,
    }).expect(404);
    await post('reader', '/ai/explain-card', {
      lessonId: '00000000-0000-4000-8000-000000000000',
      card: 0,
    }).expect(404);
    const locked = await post('reader', '/ai/explain-card', {
      lessonId: lessonIds[5],
      card: 0,
    }).expect(403);
    expect(locked.body).toMatchObject({ error: { code: 'LESSON_LOCKED' } });
    await post('reader', '/ai/explain-card', {
      lessonId: lessonIds[0],
      card: 9,
    }).expect(400);
    expect(explainCard).not.toHaveBeenCalled();
  });

  it('more than 10 tutor requests in a minute returns 429 RATE_LIMITED', async () => {
    giveHint.mockResolvedValue({ hint: 'ok' });
    for (let i = 0; i < 10; i++) await hint('burst').expect(200);
    const res = await hint('burst').expect(429);
    expect(res.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('the 21st request of the day returns 429 DAILY_LIMIT_REACHED (FR-14)', async () => {
    giveHint.mockResolvedValue({ hint: 'ok' });
    // As if learner had used 19 today (faster than 19 calls, and the
    // 10-a-minute throttle would stop those anyway).
    await db
      .update(aiUsage)
      .set({ count: 19 })
      .where(
        and(
          eq(aiUsage.userId, USERS.learner.id),
          eq(aiUsage.day, istDate(new Date())),
        ),
      );
    const last = (await hint('learner').expect(200)).body as HintResponse;
    expect(last.remainingToday).toBe(0);

    const res = await hint('learner').expect(429);
    expect(res.body).toMatchObject({
      error: {
        code: 'DAILY_LIMIT_REACHED',
        message: expect.stringContaining('20') as string,
      },
    });
  });
});
