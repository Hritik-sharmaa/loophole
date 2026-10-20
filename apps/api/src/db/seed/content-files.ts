import type {
  ExerciseKind,
  LearnCard,
  LessonLearn,
  QuickCheck,
  TestCase,
  WebCheck,
} from '@loophole/shared';
import { parse as parseSelector } from 'css-what';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { exerciseKind } from '../../common/exercise-kind.js';

// Reads and checks the content/ folder (docs/CONTENT_GUIDE.md) without
// touching the database, so a broken file fails fast with its path.

// A program exercise has tests and no checks; a web exercise (ADR-024) has
// checks and empty test lists.
export type LessonContent = {
  slug: string;
  title: string;
  position: number;
  learn: LessonLearn | null;
  exercise: {
    prompt: string;
    starterCode: string;
    sampleTests: TestCase[];
    hiddenTests: TestCase[];
    checks: WebCheck[] | null;
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
  description: string;
  units: UnitContent[];
};

// content/duels/<language>/<slug>.json (docs/CONTENT_GUIDE.md §5).
export type DuelProblemContent = {
  slug: string;
  title: string;
  language: string;
  difficulty: number;
  description: string;
  buggyCode: string;
  bugCount: number;
  sampleTests: TestCase[];
  hiddenTests: TestCase[];
};

export class ContentError extends Error {
  constructor(file: string, problem: string) {
    super(`${file}: ${problem}`);
  }
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_SAMPLE_TESTS = 1;
const MIN_HIDDEN_TESTS = 3;
// A Learn step stays short: a few cards, then one question (CONTENT_GUIDE §3).
const MAX_LEARN_CARDS = 5;
const MIN_CHECK_OPTIONS = 2;
const MAX_CHECK_OPTIONS = 4;
const MIN_WEB_CHECKS = 1;

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

  const kind = exerciseKind(course.language);
  const units = readdirSync(courseDir)
    .map((name) => join(courseDir, name))
    .filter((dir) => statSync(dir).isDirectory())
    .map((dir) => loadUnit(dir, root, kind));

  assertUnique(units, 'slug', label(courseDir, root), 'unit');
  assertUnique(units, 'position', label(courseDir, root), 'unit');
  return { ...course, units: sortByPosition(units) };
}

function loadUnit(
  unitDir: string,
  root: string,
  kind: ExerciseKind,
): UnitContent {
  const unitFile = join(unitDir, 'unit.json');
  if (!existsSync(unitFile)) {
    throw new ContentError(label(unitDir, root), 'missing unit.json');
  }
  const unit = parseUnit(readJson(unitFile, root), label(unitFile, root));

  const lessons = readdirSync(unitDir)
    .filter((name) => name.endsWith('.json') && name !== 'unit.json')
    .map((name) => join(unitDir, name))
    .map((file) => parseLesson(readJson(file, root), label(file, root), kind));

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
    // Optional: a course without one shows only its title in the catalog.
    description:
      o.description === undefined
        ? ''
        : asText(o.description, file, 'description'),
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

export function parseLesson(
  json: unknown,
  file: string,
  kind: ExerciseKind = 'program',
): LessonContent {
  const o = asObject(json, file);
  const ex = asObject(o.exercise, file, 'exercise');
  const prompt = asText(ex.prompt, file, 'exercise.prompt');
  const starterCode = asString(ex.starterCode, file, 'exercise.starterCode');

  let exercise: LessonContent['exercise'];
  if (kind === 'web') {
    if (ex.sampleTests !== undefined || ex.hiddenTests !== undefined) {
      throw new ContentError(
        file,
        'a web exercise has checks, not sampleTests or hiddenTests',
      );
    }
    exercise = {
      prompt,
      starterCode,
      sampleTests: [],
      hiddenTests: [],
      checks: asWebChecks(ex.checks, file),
    };
  } else {
    if (ex.checks !== undefined) {
      throw new ContentError(file, 'only web exercises have checks');
    }
    exercise = {
      prompt,
      starterCode,
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
      checks: null,
    };
  }

  return {
    slug: asSlug(o.slug, file, 'slug'),
    title: asText(o.title, file, 'title'),
    position: asPosition(o.position, file),
    learn: o.learn === undefined ? null : parseLearn(o.learn, file, kind),
    exercise,
  };
}

// ADR-024. Selectors are parsed here so a typo fails CI, not a learner.
function asWebChecks(value: unknown, file: string): WebCheck[] {
  const field = 'exercise.checks';
  if (!Array.isArray(value) || value.length < MIN_WEB_CHECKS) {
    throw new ContentError(
      file,
      `${field} needs at least ${MIN_WEB_CHECKS} check(s)`,
    );
  }
  return value.map((json, i): WebCheck => {
    const at = `${field}[${i}]`;
    const o = asObject(json, file, at);
    const label = asText(o.label, file, `${at}.label`);
    const selector = asText(o.selector, file, `${at}.selector`);
    try {
      parseSelector(selector);
    } catch {
      throw new ContentError(file, `${at}.selector "${selector}" is not valid`);
    }

    switch (o.type) {
      case 'element': {
        const check: WebCheck = { type: 'element', label, selector };
        if (o.min !== undefined)
          check.min = asIntIn(o.min, 1, 100, file, `${at}.min`);
        if (o.text !== undefined)
          check.text = asText(o.text, file, `${at}.text`);
        return check;
      }
      case 'attribute': {
        const check: WebCheck = {
          type: 'attribute',
          label,
          selector,
          name: asText(o.name, file, `${at}.name`),
        };
        if (o.value !== undefined) {
          check.value = asString(o.value, file, `${at}.value`);
        }
        return check;
      }
      case 'style': {
        const values = [o.value].flat();
        if (values.length === 0) {
          throw new ContentError(file, `${at}.value needs a value`);
        }
        return {
          type: 'style',
          label,
          selector,
          property: asText(o.property, file, `${at}.property`),
          value: values.map((v, j) => asText(v, file, `${at}.value[${j}]`)),
        };
      }
      default:
        throw new ContentError(
          file,
          `${at}.type must be element, attribute or style`,
        );
    }
  });
}

export function parseLearn(
  json: unknown,
  file: string,
  kind: ExerciseKind = 'program',
): LessonLearn {
  const o = asObject(json, file, 'learn');
  if (
    !Array.isArray(o.cards) ||
    o.cards.length < 1 ||
    o.cards.length > MAX_LEARN_CARDS
  ) {
    throw new ContentError(
      file,
      `learn.cards needs 1 to ${MAX_LEARN_CARDS} cards`,
    );
  }
  const cards = o.cards.map((c, i) =>
    parseCard(c, file, `learn.cards[${i}]`, kind),
  );
  return { cards, check: parseCheck(o.check, file) };
}

// An example is code plus the output it prints; input is optional stdin.
// A web example (ADR-024) is HTML shown in a live preview, so it has no
// input or output.
function parseCard(
  json: unknown,
  file: string,
  field: string,
  kind: ExerciseKind,
): LearnCard {
  const o = asObject(json, file, field);
  const card: LearnCard = {
    title: asText(o.title, file, `${field}.title`),
    body: asText(o.body, file, `${field}.body`),
  };
  if (o.code === undefined || kind === 'web') {
    if (o.input !== undefined || o.output !== undefined) {
      throw new ContentError(
        file,
        kind === 'web'
          ? `${field}: web examples show a preview, so no input or output`
          : `${field} has input or output but no code`,
      );
    }
    if (o.code !== undefined) card.code = asText(o.code, file, `${field}.code`);
    return card;
  }
  card.code = asText(o.code, file, `${field}.code`);
  card.output = asString(o.output, file, `${field}.output`);
  if (o.input !== undefined) {
    card.input = asString(o.input, file, `${field}.input`);
  }
  return card;
}

function parseCheck(json: unknown, file: string): QuickCheck {
  const field = 'learn.check';
  const o = asObject(json, file, field);
  if (
    !Array.isArray(o.options) ||
    o.options.length < MIN_CHECK_OPTIONS ||
    o.options.length > MAX_CHECK_OPTIONS
  ) {
    throw new ContentError(
      file,
      `${field}.options needs ${MIN_CHECK_OPTIONS} to ${MAX_CHECK_OPTIONS} options`,
    );
  }
  const options = o.options.map((opt, i) =>
    asText(opt, file, `${field}.options[${i}]`),
  );
  if (new Set(options).size !== options.length) {
    throw new ContentError(file, `${field}.options has duplicates`);
  }
  const check: QuickCheck = {
    question: asText(o.question, file, `${field}.question`),
    options,
    answer: asIntIn(o.answer, 0, options.length - 1, file, `${field}.answer`),
    explanation: asText(o.explanation, file, `${field}.explanation`),
  };
  if (o.code !== undefined) {
    check.code = asText(o.code, file, `${field}.code`);
  }
  return check;
}

// Every content/duels/<language>/*.json file. The folder name must match
// the file's language, so a problem can't land in the wrong pool.
export function loadDuelProblems(contentDir: string): DuelProblemContent[] {
  const duelsDir = join(contentDir, 'duels');
  if (!existsSync(duelsDir)) return [];

  const problems = readdirSync(duelsDir)
    .map((name) => join(duelsDir, name))
    .filter((dir) => statSync(dir).isDirectory())
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => join(dir, name))
        .map((file) => {
          const where = label(file, contentDir);
          const problem = parseDuelProblem(readJson(file, contentDir), where);
          const folder = label(dir, duelsDir);
          if (problem.language !== folder) {
            throw new ContentError(
              where,
              `language "${problem.language}" does not match its folder "${folder}"`,
            );
          }
          return problem;
        }),
    );

  const seen = new Set<string>();
  for (const p of problems) {
    if (seen.has(p.slug)) {
      throw new ContentError('duels', `two problems share slug ${p.slug}`);
    }
    seen.add(p.slug);
  }
  return problems;
}

export function parseDuelProblem(
  json: unknown,
  file: string,
): DuelProblemContent {
  const o = asObject(json, file);
  return {
    slug: asSlug(o.slug, file, 'slug'),
    title: asText(o.title, file, 'title'),
    language: asText(o.language, file, 'language'),
    difficulty: asIntIn(o.difficulty, 1, 3, file, 'difficulty'),
    description: asText(o.description, file, 'description'),
    buggyCode: asText(o.buggyCode, file, 'buggyCode'),
    bugCount: asIntIn(o.bugCount, 1, 3, file, 'bugCount'),
    sampleTests: asTests(o.sampleTests, file, 'sampleTests', MIN_SAMPLE_TESTS),
    hiddenTests: asTests(o.hiddenTests, file, 'hiddenTests', MIN_HIDDEN_TESTS),
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

function asIntIn(
  value: unknown,
  min: number,
  max: number,
  file: string,
  field: string,
): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  ) {
    throw new ContentError(
      file,
      `${field} must be a whole number from ${min} to ${max}`,
    );
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
