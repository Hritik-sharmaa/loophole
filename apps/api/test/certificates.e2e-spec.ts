import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CertificateSummary,
  CoursePath,
  PublicCertificate,
  SubmissionResult,
} from '@loophole/shared';
import { count, eq } from 'drizzle-orm';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import {
  certificates,
  exercises,
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
import {
  CONTENT_DIR,
  createTestDb,
  createTestUser,
  type TestDb,
} from './support/test-db.js';

const USERS: Record<string, AuthUser> = {
  grad: {
    id: '12121212-1212-4121-8121-121212121212',
    email: 'grad@example.com',
    name: 'Grad',
  },
  newbie: {
    id: '34343434-3434-4343-8343-343434343434',
    email: 'newbie@example.com',
    name: 'Newbie',
  },
};

// Real HTTP stack + real SQL (PGlite) + the real 40-lesson course.
// Supabase and Piston are stubbed: "solve:<exerciseId>" prints the answers.
describe('Certificates (e2e, FR-15)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<Server>;
  let lessonIds: string[];
  const exerciseOf = new Map<string, string>();
  const answers = new Map<string, Map<string, string>>();

  const http = () => request(app.getHttpServer());
  const solve = (who: string, lessonId: string) => {
    const exerciseId = exerciseOf.get(lessonId)!;
    return http()
      .post('/submissions')
      .set('Authorization', `Bearer ${who}`)
      .send({ exerciseId, code: `solve:${exerciseId}` })
      .expect(201)
      .then((res) => res.body as SubmissionResult);
  };

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const [name, user] of Object.entries(USERS)) {
      await createTestUser(db, user.id, name);
    }
    for (const e of await db.select().from(exercises)) {
      exerciseOf.set(e.lessonId, e.id);
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
      .useValue({ verify: (t: string) => Promise.resolve(USERS[t] ?? null) })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const path = (
      await http()
        .get('/courses/python/path')
        .set('Authorization', 'Bearer grad')
    ).body as CoursePath;
    lessonIds = path.units.flatMap((u) => u.lessons.map((l) => l.id));
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('a lesson that does not finish the course issues nothing', async () => {
    expect((await solve('newbie', lessonIds[0])).certificateSlug).toBeNull();
  });

  it('the last lesson of the course issues a certificate, once', async () => {
    // As if grad had already finished the first 39 lessons.
    await db.insert(userProgress).values(
      lessonIds.slice(0, -1).map((lessonId) => ({
        userId: USERS.grad.id,
        lessonId,
      })),
    );

    const last = await solve('grad', lessonIds.at(-1)!);
    expect(last.status).toBe('passed');
    expect(last.certificateSlug).toMatch(/^[a-z2-9]{10}$/);

    // Solving any lesson again issues nothing new.
    expect((await solve('grad', lessonIds.at(-1)!)).certificateSlug).toBeNull();
    const [{ n }] = await db
      .select({ n: count() })
      .from(certificates)
      .where(eq(certificates.userId, USERS.grad.id));
    expect(n).toBe(1);
  });

  it('GET /certificates lists the user’s own', async () => {
    const mine = (
      await http()
        .get('/certificates')
        .set('Authorization', 'Bearer grad')
        .expect(200)
    ).body as CertificateSummary[];
    expect(mine).toEqual([
      expect.objectContaining({ courseTitle: expect.any(String) as string }),
    ]);

    const none = await http()
      .get('/certificates')
      .set('Authorization', 'Bearer newbie')
      .expect(200);
    expect(none.body).toEqual([]);
  });

  it('GET /certificates/:slug is public and shows only name, course and date', async () => {
    const [{ slug }] = (
      await http().get('/certificates').set('Authorization', 'Bearer grad')
    ).body as CertificateSummary[];

    const res = await http().get(`/certificates/${slug}`).expect(200); // no token
    const cert = res.body as PublicCertificate;
    expect(Object.keys(cert).sort()).toEqual([
      'courseTitle',
      'issuedAt',
      'username',
    ]);
    expect(cert.username).toBe('grad');
    expect(new Date(cert.issuedAt).getTime()).not.toBeNaN();
  });

  it.each([
    ['an unknown slug', 'abcdefghjk'],
    ['a malformed slug', 'not-a-slug!'],
  ])('404 for %s', async (_case, slug) => {
    const res = await http()
      .get(`/certificates/${encodeURIComponent(slug)}`)
      .expect(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
