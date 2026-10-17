import { asc, eq } from 'drizzle-orm';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lessons, units } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import { createTestDb, type TestDb } from './support/test-db.js';

// Edits to content/ between seeds: reorder, rename, remove.
describe('seedContent re-runs', () => {
  let testDb: TestDb;
  let root: string;
  const unitDir = () => join(root, 'py', '01-basics');

  const lesson = (slug: string, title: string, position: number) => ({
    slug,
    title,
    position,
    exercise: {
      prompt: `Do ${slug}.`,
      starterCode: '',
      sampleTests: [{ input: '', expectedOutput: 'x' }],
      hiddenTests: [1, 2, 3].map(() => ({ input: '', expectedOutput: 'x' })),
    },
  });
  const write = (file: string, json: unknown) =>
    writeFileSync(join(unitDir(), file), JSON.stringify(json));

  const lessonOrder = () =>
    testDb.db
      .select({ id: lessons.id, slug: lessons.slug, title: lessons.title })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .orderBy(asc(lessons.position));

  beforeEach(async () => {
    testDb = await createTestDb();
    root = mkdtempSync(join(tmpdir(), 'loophole-seed-'));
    mkdirSync(unitDir(), { recursive: true });
    writeFileSync(
      join(root, 'py', 'course.json'),
      JSON.stringify({ slug: 'py', title: 'Py', language: 'python' }),
    );
    write('unit.json', { slug: 'basics', title: 'Basics', position: 1 });
    write('a.json', lesson('a', 'Lesson A', 1));
    write('b.json', lesson('b', 'Lesson B', 2));
    await seedContent(testDb.db, root);
  });

  afterEach(async () => {
    await testDb.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('swaps two lessons and keeps their ids', async () => {
    const before = await lessonOrder();
    write('a.json', lesson('a', 'Lesson A', 2));
    write('b.json', lesson('b', 'Lesson B', 1));
    await seedContent(testDb.db, root);

    const after = await lessonOrder();
    expect(after.map((l) => l.slug)).toEqual(['b', 'a']);
    expect(after.find((l) => l.slug === 'a')?.id).toBe(before[0].id);
  });

  it('updates an edited title in place', async () => {
    write('a.json', lesson('a', 'Lesson A, renamed', 1));
    await seedContent(testDb.db, root);
    expect((await lessonOrder())[0].title).toBe('Lesson A, renamed');
  });

  it('reports a removed lesson as stale instead of deleting it', async () => {
    rmSync(join(unitDir(), 'b.json'));
    const summary = await seedContent(testDb.db, root);
    expect(summary.stale).toEqual(['py/basics/b']);
    expect(await lessonOrder()).toHaveLength(2);
  });
});
