import type { TestCase } from '@loophole/shared';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Reads and checks the content/ folder (docs/CONTENT_GUIDE.md) without
// touching the database, so a broken file fails fast with its path.

export type LessonContent = {
  slug: string;
  title: string;
  position: number;
  exercise: {
    prompt: string;
    starterCode: string;
    sampleTests: TestCase[];
    hiddenTests: TestCase[];
  };
};

export type UnitContent = {
  slug: string;
  title: string;
  position: number;
  lessons: LessonContent[];
};

export type CourseContent = {
  slug: string;
  title: string;
  language: string;
  units: UnitContent[];
};

export class ContentError extends Error {
  constructor(file: string, problem: string) {
    super(`${file}: ${problem}`);
  }
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_SAMPLE_TESTS = 1;
const MIN_HIDDEN_TESTS = 3;

// Every folder in contentDir that has a course.json is one course.
// Other folders (e.g. duels/) are skipped.
export function loadAllContent(contentDir: string): CourseContent[] {
  return readdirSync(contentDir)
    .map((name) => join(contentDir, name))
    .filter((dir) => existsSync(join(dir, 'course.json')))
    .map((dir) => loadCourse(dir, contentDir));
}

export function loadCourse(courseDir: string, root = courseDir): CourseContent {
  const courseFile = join(courseDir, 'course.json');
  const course = parseCourse(
    readJson(courseFile, root),
    label(courseFile, root),
  );

  const units = readdirSync(courseDir)
    .map((name) => join(courseDir, name))
    .filter((dir) => statSync(dir).isDirectory())
    .map((dir) => loadUnit(dir, root));

  assertUnique(units, 'slug', label(courseDir, root), 'unit');
  assertUnique(units, 'position', label(courseDir, root), 'unit');
  return { ...course, units: sortByPosition(units) };
}

function loadUnit(unitDir: string, root: string): UnitContent {
  const unitFile = join(unitDir, 'unit.json');
  if (!existsSync(unitFile)) {
    throw new ContentError(label(unitDir, root), 'missing unit.json');
  }
  const unit = parseUnit(readJson(unitFile, root), label(unitFile, root));

  const lessons = readdirSync(unitDir)
    .filter((name) => name.endsWith('.json') && name !== 'unit.json')
    .map((name) => join(unitDir, name))
    .map((file) => parseLesson(readJson(file, root), label(file, root)));

  assertUnique(lessons, 'slug', label(unitDir, root), 'lesson');
  assertUnique(lessons, 'position', label(unitDir, root), 'lesson');
  return { ...unit, lessons: sortByPosition(lessons) };
}

export function parseCourse(
  json: unknown,
  file: string,
): Omit<CourseContent, 'units'> {
  const o = asObject(json, file);
  return {
    slug: asSlug(o.slug, file, 'slug'),
    title: asText(o.title, file, 'title'),
    language: asText(o.language, file, 'language'),
  };
}

export function parseUnit(
  json: unknown,
  file: string,
): Omit<UnitContent, 'lessons'> {
  const o = asObject(json, file);
  return {
    slug: asSlug(o.slug, file, 'slug'),
    title: asText(o.title, file, 'title'),
    position: asPosition(o.position, file),
  };
}

export function parseLesson(json: unknown, file: string): LessonContent {
  const o = asObject(json, file);
  const ex = asObject(o.exercise, file, 'exercise');
  return {
    slug: asSlug(o.slug, file, 'slug'),
    title: asText(o.title, file, 'title'),
    position: asPosition(o.position, file),
    exercise: {
      prompt: asText(ex.prompt, file, 'exercise.prompt'),
      starterCode: asString(ex.starterCode, file, 'exercise.starterCode'),
      sampleTests: asTests(
        ex.sampleTests,
        file,
        'exercise.sampleTests',
        MIN_SAMPLE_TESTS,
      ),
      hiddenTests: asTests(
        ex.hiddenTests,
        file,
        'exercise.hiddenTests',
        MIN_HIDDEN_TESTS,
      ),
    },
  };
}

// --- small checkers -------------------------------------------------------

function readJson(file: string, root: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new ContentError(label(file, root), `invalid JSON (${String(err)})`);
  }
}

function label(path: string, root: string): string {
  return relative(root, path).replaceAll('\\', '/') || '.';
}

function asObject(
  value: unknown,
  file: string,
  field = 'file',
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentError(file, `${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, file: string, field: string): string {
  if (typeof value !== 'string') {
    throw new ContentError(file, `${field} must be a string`);
  }
  return value;
}

function asText(value: unknown, file: string, field: string): string {
  const text = asString(value, file, field);
  if (text.trim() === '') throw new ContentError(file, `${field} is empty`);
  return text;
}

function asSlug(value: unknown, file: string, field: string): string {
  const slug = asString(value, file, field);
  if (!SLUG.test(slug)) {
    throw new ContentError(file, `${field} "${slug}" must be kebab-case`);
  }
  return slug;
}

function asPosition(value: unknown, file: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new ContentError(file, 'position must be a whole number ≥ 1');
  }
  return value as number;
}

function asTests(
  value: unknown,
  file: string,
  field: string,
  min: number,
): TestCase[] {
  if (!Array.isArray(value) || value.length < min) {
    throw new ContentError(file, `${field} needs at least ${min} test(s)`);
  }
  return value.map((test, i) => {
    const t = asObject(test, file, `${field}[${i}]`);
    return {
      input: asString(t.input, file, `${field}[${i}].input`),
      expectedOutput: asString(
        t.expectedOutput,
        file,
        `${field}[${i}].expectedOutput`,
      ),
    };
  });
}

function assertUnique<T extends { slug: string; position: number }>(
  items: T[],
  key: 'slug' | 'position',
  where: string,
  kind: string,
): void {
  const seen = new Set<string | number>();
  for (const item of items) {
    if (seen.has(item[key])) {
      throw new ContentError(where, `two ${kind}s share ${key} ${item[key]}`);
    }
    seen.add(item[key]);
  }
}

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}
