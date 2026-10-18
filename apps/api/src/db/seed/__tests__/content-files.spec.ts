import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  ContentError,
  loadAllContent,
  loadDuelProblems,
  parseDuelProblem,
  parseLesson,
} from '../content-files.js';

const REAL_CONTENT = resolve(import.meta.dirname, '../../../../../../content');

const validLesson = {
  slug: 'add-two-numbers',
  title: 'Add two numbers',
  position: 1,
  exercise: {
    prompt: 'Print the sum.',
    starterCode: 'a = int(input())\n',
    sampleTests: [{ input: '2\n3\n', expectedOutput: '5' }],
    hiddenTests: [
      { input: '0\n0\n', expectedOutput: '0' },
      { input: '-4\n10\n', expectedOutput: '6' },
      { input: '1\n1\n', expectedOutput: '2' },
    ],
  },
};

describe('the real content/ folder', () => {
  // Runs in CI, so a broken lesson file fails the build, not the seed.
  it('loads without errors', () => {
    const [python] = loadAllContent(REAL_CONTENT);
    expect(python.slug).toBe('python');
    expect(python.units.map((u) => u.slug)).toEqual(['basics', 'conditionals']);
    const lessonCount = python.units.flatMap((u) => u.lessons).length;
    expect(lessonCount).toBe(10);
  });
});

describe('parseLesson', () => {
  it('accepts a valid lesson', () => {
    expect(parseLesson(validLesson, 'x.json').slug).toBe('add-two-numbers');
  });

  it.each([
    ['a missing title', { ...validLesson, title: undefined }, /title/],
    ['a non-kebab slug', { ...validLesson, slug: 'Add_Two' }, /kebab-case/],
    ['position 0', { ...validLesson, position: 0 }, /position/],
    [
      'too few hidden tests',
      {
        ...validLesson,
        exercise: {
          ...validLesson.exercise,
          hiddenTests: validLesson.exercise.hiddenTests.slice(0, 2),
        },
      },
      /hiddenTests needs at least 3/,
    ],
    [
      'a test without expectedOutput',
      {
        ...validLesson,
        exercise: {
          ...validLesson.exercise,
          sampleTests: [{ input: '1\n' }],
        },
      },
      /sampleTests\[0\]\.expectedOutput/,
    ],
  ])('rejects %s, naming the file', (_case, json, problem) => {
    expect(() => parseLesson(json, 'unit/bad.json')).toThrow(ContentError);
    expect(() => parseLesson(json, 'unit/bad.json')).toThrow(problem);
    expect(() => parseLesson(json, 'unit/bad.json')).toThrow(/unit\/bad\.json/);
  });
});

describe('loadAllContent folder checks', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'loophole-content-'));
    const unit = join(root, 'py', '01-basics');
    mkdirSync(unit, { recursive: true });
    write(join(root, 'py', 'course.json'), {
      slug: 'py',
      title: 'Py',
      language: 'python',
    });
    write(join(unit, 'unit.json'), {
      slug: 'basics',
      title: 'Basics',
      position: 1,
    });
    write(join(unit, '01-a.json'), { ...validLesson, slug: 'a', position: 1 });
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('rejects two lessons with the same position', () => {
    write(join(root, 'py', '01-basics', '02-b.json'), {
      ...validLesson,
      slug: 'b',
      position: 1,
    });
    expect(() => loadAllContent(root)).toThrow(/share position 1/);
  });

  it('rejects a unit folder without unit.json', () => {
    mkdirSync(join(root, 'py', '02-empty'));
    expect(() => loadAllContent(root)).toThrow(/missing unit\.json/);
  });

  it('skips folders without course.json, like duels/', () => {
    mkdirSync(join(root, 'duels'));
    expect(loadAllContent(root)).toHaveLength(1);
  });
});

function write(file: string, json: unknown): void {
  writeFileSync(file, JSON.stringify(json));
}

const validDuel = {
  slug: 'sum-to-n',
  title: 'Sum to N',
  language: 'python',
  difficulty: 1,
  description: 'Print the sum from 1 to N.',
  buggyCode: 'print(0)\n',
  bugCount: 1,
  sampleTests: [{ input: '3\n', expectedOutput: '6' }],
  hiddenTests: [
    { input: '1\n', expectedOutput: '1' },
    { input: '2\n', expectedOutput: '3' },
    { input: '4\n', expectedOutput: '10' },
  ],
};

describe('duel problems', () => {
  // docs/CONTENT_GUIDE.md §5 and FR-26: at least 15, split 6 / 6 / 3.
  it('the real content/duels folder has 15 problems at the right levels', () => {
    const problems = loadDuelProblems(REAL_CONTENT);
    expect(problems).toHaveLength(15);
    const byLevel = [1, 2, 3].map(
      (d) => problems.filter((p) => p.difficulty === d).length,
    );
    expect(byLevel).toEqual([6, 6, 3]);
    expect(new Set(problems.map((p) => p.language))).toEqual(
      new Set(['python']),
    );
  });

  it('accepts a valid problem', () => {
    expect(parseDuelProblem(validDuel, 'x.json').slug).toBe('sum-to-n');
  });

  it.each([
    ['difficulty out of range', { difficulty: 4 }, /difficulty/],
    ['too many bugs', { bugCount: 5 }, /bugCount/],
    ['no buggy code', { buggyCode: ' ' }, /buggyCode/],
    ['too few hidden tests', { hiddenTests: [] }, /hiddenTests/],
  ])('rejects %s', (_case, patch, message) => {
    expect(() =>
      parseDuelProblem({ ...validDuel, ...patch }, 'x.json'),
    ).toThrow(message);
  });

  it('rejects a problem whose language does not match its folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'duels-'));
    try {
      mkdirSync(join(root, 'duels', 'javascript'), { recursive: true });
      writeFileSync(
        join(root, 'duels', 'javascript', 'x.json'),
        JSON.stringify(validDuel),
      );
      expect(() => loadDuelProblems(root)).toThrow(ContentError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
