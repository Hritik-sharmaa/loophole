import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CoursePath,
  LessonDetail,
  MeResponse,
  PracticeSet,
  UnitBugHunt,
  UnitCheatSheet,
} from '@loophole/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
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
import { userProgress } from '../src/db/schema/index.js';

const USERS: Record<string, AuthUser> = {
  ada: {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'ada@example.com',
    name: 'ada',
  },
  bob: {
    id: 'e2222222-2222-4222-8222-222222222222',
    email: 'bob@example.com',
    name: 'bob',
  },
};

// Real HTTP stack + real SQL (PGlite) + the real Python course, whose
// lessons carry Hinglish (ADR-042). Supabase is stubbed.
describe('Hinglish lessons (e2e, ADR-042)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<App>;
  let path: CoursePath;
  const bodies: { who: string; body: unknown }[] = [];

  const http = () => request(app.getHttpServer());
  const get = async <T>(who: string, url: string): Promise<T> => {
    const res = await http()
      .get(url)
      .set('Authorization', `Bearer ${who}`)
      .expect(200);
    bodies.push({ who, body: res.body });
    return res.body as T;
  };
  const setLanguage = (who: string, lessonLanguage: unknown, status = 200) =>
    http()
      .patch('/me')
      .set('Authorization', `Bearer ${who}`)
      .send({ lessonLanguage })
      .expect(status)
      .then((res) => res.body as MeResponse);

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    for (const [name, u] of Object.entries(USERS)) {
      await createTestUser(db, u.id, name);
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: (token: string) => Promise.resolve(USERS[token]) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    path = await get<CoursePath>('ada', '/courses/python/path');
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  const firstLesson = () => path.units[0].lessons[0].id;

  it('English by default, with no Hinglish attached', async () => {
    expect((await get<MeResponse>('ada', '/me')).lessonLanguage).toBe('en');
    const lesson = await get<LessonDetail>('ada', `/lessons/${firstLesson()}`);
    expect(lesson.learn?.cards[0].title).toBe('Your first line of Python');
    expect(lesson.learn?.check.question).toBe('What does this print?');
    expect(lesson.exercise.prompt).toContain('Every programmer starts here');
  });

  it('PATCH /me switches to Hinglish: cards, check, bug fix and prompt follow', async () => {
    expect((await setLanguage('ada', 'hinglish')).lessonLanguage).toBe(
      'hinglish',
    );
    const lesson = await get<LessonDetail>('ada', `/lessons/${firstLesson()}`);
    const cards = lesson.learn!.cards;
    expect(cards[0].title).toBe('Python ki pehli line');
    // Code and outputs never change.
    expect(cards[0].code).toBe('print("Hello!")\n');
    expect(cards[0].output).toBe('Hello!');
    expect(cards[3].bug).toEqual({
      line: 2,
      fix: expect.stringContaining('closing quote nahi hai') as string,
    });
    expect(lesson.learn?.check).toMatchObject({
      question: 'Yeh kya print karega?',
      options: ['Hi, there!', '"Hi, there!"', 'print Hi, there!'],
      answer: 0,
    });
    // The exact output the grader wants is still there.
    expect(lesson.exercise.prompt).toBe(
      'Har programmer yahin se shuru karta hai. Bilkul `Hello, Loophole!` print karo.',
    );
  });

  it('word options switch too, output options stay', async () => {
    const third = path.units[0].lessons[2].id;
    await db
      .insert(userProgress)
      .values(
        path.units[0].lessons
          .slice(0, 2)
          .map((l) => ({ userId: USERS.ada.id, lessonId: l.id })),
      );
    const lesson = await get<LessonDetail>('ada', `/lessons/${third}`);
    expect(lesson.learn?.check.options).toEqual(['8', '44', 'Error aayega']);
  });

  it('the cheat sheet, bug hunt and practice follow the setting', async () => {
    const unit = path.units[0].id;
    const sheet = await get<UnitCheatSheet>(
      'ada',
      `/courses/python/units/${unit}/cheatsheet`,
    );
    expect(sheet.lessons[0].cards[0].title).toBe('Python ki pehli line');
    const hunt = await get<UnitBugHunt>(
      'ada',
      `/courses/python/units/${unit}/bug-hunt`,
    );
    expect(hunt.bugs[0]).toMatchObject({ title: 'Bug dhoondo' });
    const practice = await get<PracticeSet>('ada', '/courses/python/practice');
    expect(practice.items.length).toBeGreaterThan(0);
    for (const item of practice.items) {
      if (item.kind === 'check') {
        expect(item.check.question).toBe('Yeh kya print karega?');
      } else {
        expect(item.body).toMatch(/karo|hai/);
      }
    }

    // bob never switched: the same unit in English.
    const bobs = await get<UnitCheatSheet>(
      'bob',
      `/courses/python/units/${unit}/cheatsheet`,
    );
    expect(bobs.lessons[0].cards[0].title).toBe('Your first line of Python');
  });

  it('JavaScript lessons are in Hinglish too', async () => {
    const js = await get<CoursePath>('ada', '/courses/javascript/path');
    const lesson = await get<LessonDetail>(
      'ada',
      `/lessons/${js.units[0].lessons[0].id}`,
    );
    expect(lesson.learn?.cards[0].title).toBe('console.log() print karta hai');
    expect(lesson.exercise.prompt).toContain('`Hello, JavaScript!`');
    expect(lesson.exercise.prompt).toContain('Har programmer');
  });

  it('switching back gives English again', async () => {
    await setLanguage('ada', 'en');
    const lesson = await get<LessonDetail>('ada', `/lessons/${firstLesson()}`);
    expect(lesson.learn?.cards[0].title).toBe('Your first line of Python');
  });

  it('rejects a language there is no text for', async () => {
    await setLanguage('ada', 'hindi', 400);
  });

  it('no response carries the stored Hinglish blocks', () => {
    for (const { body } of bodies) {
      const json = JSON.stringify(body);
      expect(json).not.toContain('"hi":');
      expect(json).not.toContain('promptHi');
      expect(json).not.toMatch(/hidden_?tests/i);
    }
  });
});
