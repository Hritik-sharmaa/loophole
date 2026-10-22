import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  ContentError,
  loadAllContent,
  loadDuelProblems,
  parseDuelProblem,
  parseLearn,
  parseLesson,
} from '../content-files.js';
import { gradeGit } from '../../../modules/git/git-checks.js';
import {
  checkPage,
  gradeChecks,
} from '../../../modules/submissions/web-checks.js';

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
  const course = (slug: string) => {
    const found = loadAllContent(REAL_CONTENT).find((c) => c.slug === slug);
    if (!found) throw new Error(`no course ${slug}`);
    return found;
  };

  it('loads without errors', () => {
    const python = course('python');
    // The full v1 track (docs/CONTENT_GUIDE.md §4, goal G-1): 40 lessons,
    // plus one checkpoint project per unit (ADR-043).
    expect(python.units.map((u) => [u.slug, u.lessons.length])).toEqual([
      ['basics', 7],
      ['conditionals', 7],
      ['loops', 8],
      ['strings', 7],
      ['lists', 7],
      ['functions', 6],
      ['dictionaries', 5],
    ]);
  });

  // ADR-024: the HTML & CSS track, graded by checks instead of tests.
  // ADR-026: replayed on the simulated repository, checked by rules.
  it('loads the Git & GitHub course as git exercises nobody passes by doing nothing', () => {
    const git = course('git-github');
    expect(git.language).toBe('git');
    expect(git.units.map((u) => [u.slug, u.lessons.length])).toEqual([
      ['first-repo', 6],
      ['branches', 4],
      ['github', 5],
    ]);
    for (const lesson of git.units.flatMap((u) => u.lessons)) {
      const scenario = lesson.exercise.gitScenario;
      expect(scenario?.checks.length, lesson.slug).toBeGreaterThan(0);
      expect(
        gradeGit(scenario!, lesson.exercise.starterCode).status,
        lesson.slug,
      ).toBe('failed');
    }
  });

  // ADR-025: graded like Python, in Piston's Node runtime.
  it('loads the JavaScript course as program exercises', () => {
    const js = course('javascript');
    expect(js.language).toBe('javascript');
    expect(js.units.map((u) => [u.slug, u.lessons.length])).toEqual([
      ['basics', 6],
      ['decisions', 4],
      ['loops', 5],
      ['arrays', 5],
      ['functions-objects', 5],
    ]);
    for (const lesson of js.units.flatMap((u) => u.lessons)) {
      expect(lesson.exercise.checks, lesson.slug).toBeNull();
      expect(lesson.exercise.hiddenTests.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('loads the HTML & CSS course as web exercises', () => {
    const html = course('html-css');
    expect(html.language).toBe('html');
    expect(html.units.map((u) => [u.slug, u.lessons.length])).toEqual([
      ['first-page', 6],
      ['page-structure', 4],
      ['css-basics', 5],
    ]);
    for (const lesson of html.units.flatMap((u) => u.lessons)) {
      expect(lesson.exercise.checks?.length, lesson.slug).toBeGreaterThan(0);
      expect(lesson.exercise.sampleTests).toEqual([]);
      // No web example has an output: the live preview is the output.
      for (const card of lesson.learn?.cards ?? []) {
        expect(card.output, lesson.slug).toBeUndefined();
      }
    }
  });

  // An exercise whose starter code already passes would pay XP for nothing.
  it('no web exercise is passed by its starter code', () => {
    for (const lesson of course('html-css').units.flatMap((u) => u.lessons)) {
      const { starterCode, checks } = lesson.exercise;
      const grade = gradeChecks(checkPage(starterCode, checks ?? []));
      expect(grade.status, lesson.slug).toBe('failed');
    }
  });

  // ADR-031: every lesson ends its cards with one bug to spot.
  it('gives every lesson one spot-the-bug card, last', () => {
    for (const course of loadAllContent(REAL_CONTENT)) {
      for (const lesson of course.units.flatMap((u) => u.lessons)) {
        // A project (ADR-043) has no Learn step.
        if (lesson.project) continue;
        const where = `${course.slug}/${lesson.slug}`;
        const bugs = lesson.learn?.cards.filter((c) => c.bug) ?? [];
        expect(bugs, where).toHaveLength(1);
        expect(lesson.learn?.cards.at(-1)?.bug, where).toBeDefined();
      }
    }
  });

  // ADR-021: every lesson teaches before it tests.
  it('gives every lesson a Learn step', () => {
    for (const course of loadAllContent(REAL_CONTENT)) {
      for (const unit of course.units) {
        for (const lesson of unit.lessons.filter((l) => !l.project)) {
          expect(lesson.learn, `${course.slug}/${lesson.slug}`).not.toBeNull();
        }
      }
    }
  });
});

const validLearn = {
  cards: [
    {
      title: 'print()',
      body: 'Shows a value.',
      code: 'print("Hi")\n',
      output: 'Hi',
    },
    { title: 'Quotes', body: 'Text goes in quotes.' },
  ],
  check: {
    question: 'What does this print?',
    code: 'print(1 + 1)\n',
    options: ['2', '11'],
    answer: 0,
    explanation: '1 + 1 is 2.',
  },
};

describe('parseLearn', () => {
  const withLearn = (learn: unknown) => ({ ...validLesson, learn });

  it('is optional: a lesson without one gets null', () => {
    expect(parseLesson(validLesson, 'x.json').learn).toBeNull();
  });

  it('accepts cards with and without examples', () => {
    const lesson = parseLesson(withLearn(validLearn), 'x.json');
    expect(lesson.learn?.cards).toHaveLength(2);
    expect(lesson.learn?.cards[1]).toEqual({
      title: 'Quotes',
      body: 'Text goes in quotes.',
    });
    expect(lesson.learn?.check.answer).toBe(0);
  });

  it('accepts a spot-the-bug card in any course language', () => {
    const bugCard = {
      title: 'Spot the bug',
      body: 'Tap the wrong line.',
      code: 'a = 1\nprint(b)\n',
      bug: { line: 2, fix: 'There is no `b`.' },
    };
    for (const kind of ['program', 'web', 'git'] as const) {
      const learn = parseLearn(
        { ...validLearn, cards: [bugCard] },
        'x.json',
        kind,
      );
      expect(learn.cards[0]).toEqual(bugCard);
    }
  });

  it.each([
    ['no cards', { ...validLearn, cards: [] }, /learn\.cards needs 1 to 5/],
    [
      'a bug line past the end of the code',
      {
        ...validLearn,
        cards: [
          {
            title: 'x',
            body: 'y',
            code: 'a = 1\nb = 2\n',
            bug: { line: 3, fix: 'z' },
          },
        ],
      },
      /learn\.cards\[0\]\.bug\.line must be a whole number from 1 to 2/,
    ],
    [
      'a bug card that tries to run',
      {
        ...validLearn,
        cards: [
          {
            title: 'x',
            body: 'y',
            code: 'print(1)\n',
            output: '1',
            bug: { line: 1, fix: 'z' },
          },
        ],
      },
      /a bug card has no input or output/,
    ],
    [
      'a bug card without a fix',
      {
        ...validLearn,
        cards: [{ title: 'x', body: 'y', code: 'a\n', bug: { line: 1 } }],
      },
      /bug\.fix/,
    ],
    [
      'an example without its output',
      {
        ...validLearn,
        cards: [{ title: 'x', body: 'y', code: 'print(1)\n' }],
      },
      /learn\.cards\[0\]\.output/,
    ],
    [
      'output without code',
      { ...validLearn, cards: [{ title: 'x', body: 'y', output: '1' }] },
      /no code/,
    ],
    [
      'an answer out of range',
      { ...validLearn, check: { ...validLearn.check, answer: 2 } },
      /learn\.check\.answer/,
    ],
    [
      'one option',
      { ...validLearn, check: { ...validLearn.check, options: ['2'] } },
      /2 to 4 options/,
    ],
    [
      'duplicate options',
      { ...validLearn, check: { ...validLearn.check, options: ['2', '2'] } },
      /duplicates/,
    ],
  ])('rejects %s, naming the file', (_case, learn, problem) => {
    expect(() => parseLesson(withLearn(learn), 'unit/bad.json')).toThrow(
      problem,
    );
    expect(() => parseLesson(withLearn(learn), 'unit/bad.json')).toThrow(
      /unit\/bad\.json/,
    );
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

describe('parseLesson for git exercises (ADR-026)', () => {
  const gitLesson = (exercise: object) => ({
    slug: 'first-commit',
    title: 'First commit',
    position: 1,
    exercise: { prompt: 'Commit it.', starterCode: '', ...exercise },
  });
  const checks = [{ type: 'repo', label: 'There is a repository' }];

  it('accepts a setup and checks', () => {
    const lesson = parseLesson(
      gitLesson({ setup: ['git init', 'touch a.txt'], checks }),
      'x.json',
      'git',
    );
    expect(lesson.exercise.gitScenario).toEqual({
      setup: ['git init', 'touch a.txt'],
      checks,
    });
    expect(lesson.exercise.checks).toBeNull();
  });

  it.each([
    [
      'a setup command that fails',
      { setup: ['git commit -m "x"'], checks },
      /exercise\.setup: "git commit -m "x"" failed: fatal: not a git repository/,
    ],
    [
      'an unknown check type',
      { checks: [{ type: 'magic', label: 'x' }] },
      /type must be one of repo, config/,
    ],
    [
      'a check without its required field',
      { checks: [{ type: 'branch', label: 'x' }] },
      /checks\[0\]\.name is required/,
    ],
    ['no checks', { checks: [] }, /needs at least 1 check/],
  ])('rejects %s', (_case, exercise, problem) => {
    expect(() => parseLesson(gitLesson(exercise), 'x.json', 'git')).toThrow(
      problem,
    );
  });
});

describe('parseLesson for web exercises (ADR-024)', () => {
  const webLesson = {
    slug: 'first-heading',
    title: 'First heading',
    position: 1,
    learn: {
      cards: [
        { title: 'Tags', body: 'Tags wrap content.', code: '<h1>Hi</h1>' },
      ],
      check: {
        question: 'Which is a heading?',
        options: ['<h1>', '<p>'],
        answer: 0,
        explanation: 'h1 is a heading.',
      },
    },
    exercise: {
      prompt: 'Write a heading.',
      starterCode: '',
      checks: [
        { type: 'element', label: 'Has an h1', selector: 'h1' },
        {
          type: 'style',
          label: 'Orange',
          selector: 'h1',
          property: 'color',
          value: 'orange',
        },
      ],
    },
  };

  it('accepts checks, normalizing a single style value to a list', () => {
    const lesson = parseLesson(webLesson, 'x.json', 'web');
    expect(lesson.exercise.checks?.[1]).toMatchObject({ value: ['orange'] });
    expect(lesson.exercise.hiddenTests).toEqual([]);
    expect(lesson.learn?.cards[0].code).toBe('<h1>Hi</h1>');
  });

  it.each([
    [
      'a bad selector',
      { checks: [{ type: 'element', label: 'x', selector: 'h1[' }] },
      /selector "h1\[" is not valid/,
    ],
    [
      'an unknown check type',
      { checks: [{ type: 'magic', label: 'x', selector: 'h1' }] },
      /must be element, attribute or style/,
    ],
    ['no checks', { checks: [] }, /checks needs at least 1/],
    [
      'tests instead of checks',
      { checks: undefined, sampleTests: [{ input: '', expectedOutput: '' }] },
      /a web exercise has checks/,
    ],
  ])('rejects %s', (_case, patch, problem) => {
    const json = {
      ...webLesson,
      exercise: { ...webLesson.exercise, ...patch },
    };
    expect(() => parseLesson(json, 'x.json', 'web')).toThrow(problem);
  });

  it('rejects an example with output in a web course', () => {
    const json = {
      ...webLesson,
      learn: {
        ...webLesson.learn,
        cards: [{ title: 'x', body: 'y', code: '<p>Hi</p>', output: 'Hi' }],
      },
    };
    expect(() => parseLesson(json, 'x.json', 'web')).toThrow(
      /no input or output/,
    );
  });

  it('rejects checks in a program course', () => {
    const json = {
      ...validLesson,
      exercise: { ...validLesson.exercise, checks: [] },
    };
    expect(() => parseLesson(json, 'x.json')).toThrow(
      /only web and git exercises/,
    );
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
  // ADR-040: a pool per duel language, each 6 / 6 / 3.
  it('the real content/duels folder has 15 problems per language at the right levels', () => {
    const problems = loadDuelProblems(REAL_CONTENT);
    expect(new Set(problems.map((p) => p.language))).toEqual(
      new Set(['python', 'javascript']),
    );
    for (const language of ['python', 'javascript']) {
      const pool = problems.filter((p) => p.language === language);
      expect(pool).toHaveLength(15);
      const byLevel = [1, 2, 3].map(
        (d) => pool.filter((p) => p.difficulty === d).length,
      );
      expect(byLevel).toEqual([6, 6, 3]);
    }
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

describe('Hinglish (ADR-042)', () => {
  const bugCard = {
    title: 'Spot the bug',
    body: 'Tap it.',
    code: 'print("Hi)\n',
    bug: { line: 1, fix: 'Close the quote.' },
  };
  const hinglish = (patch: Record<string, unknown> = {}) => ({
    ...validLesson,
    exercise: { ...validLesson.exercise, promptHi: 'Sum print karo.' },
    learn: {
      cards: [
        {
          ...validLearn.cards[0],
          hi: { title: 'print()', body: 'Value dikhata hai.' },
        },
        {
          ...bugCard,
          hi: {
            title: 'Bug dhoondo',
            body: 'Tap karo.',
            fix: 'Quote band karo.',
          },
        },
      ],
      check: {
        ...validLearn.check,
        hi: { question: 'Yeh kya print karega?', explanation: '1 + 1 = 2.' },
      },
    },
    ...patch,
  });

  it('keeps each card’s, the check’s and the prompt’s Hinglish', () => {
    const lesson = parseLesson(hinglish(), 'x.json');
    expect(lesson.exercise.promptHi).toBe('Sum print karo.');
    expect(lesson.learn?.cards[1].hi).toEqual({
      title: 'Bug dhoondo',
      body: 'Tap karo.',
      fix: 'Quote band karo.',
    });
    expect(lesson.learn?.check.hi?.question).toBe('Yeh kya print karega?');
  });

  it('a lesson without Hinglish has a null promptHi', () => {
    expect(parseLesson(validLesson, 'x.json').exercise.promptHi).toBeNull();
  });

  it('is all or nothing within a lesson', () => {
    const noPrompt = hinglish();
    // The English exercise has no promptHi.
    const exercise = validLesson.exercise;
    expect(() => parseLesson({ ...noPrompt, exercise }, 'x.json')).toThrow(
      /all or nothing/,
    );
    const onlyPrompt = {
      ...validLesson,
      learn: validLearn,
      exercise: { ...validLesson.exercise, promptHi: 'Sum print karo.' },
    };
    expect(() => parseLesson(onlyPrompt, 'x.json')).toThrow(/all or nothing/);
  });

  it('a bug card needs its fix in Hinglish, a teaching card has none', () => {
    const lesson = hinglish();
    const [card, bug] = lesson.learn.cards;
    const noFix = { ...bug, hi: { title: 'T', body: 'B' } };
    expect(() =>
      parseLesson(
        { ...lesson, learn: { ...lesson.learn, cards: [card, noFix] } },
        'x.json',
      ),
    ).toThrow(/hi\.fix/);
    const fixOnTeaching = { ...card, hi: { ...card.hi, fix: 'F' } };
    expect(() =>
      parseLesson(
        { ...lesson, learn: { ...lesson.learn, cards: [fixOnTeaching, bug] } },
        'x.json',
      ),
    ).toThrow(/bug cards only/);
  });

  it('Hinglish options need one per English option', () => {
    const lesson = hinglish();
    const check = {
      ...lesson.learn.check,
      hi: { ...lesson.learn.check.hi, options: ['2'] },
    };
    expect(() =>
      parseLesson({ ...lesson, learn: { ...lesson.learn, check } }, 'x.json'),
    ).toThrow(/one option per English option/);
  });

  // The words change, the code doesn't: every `code` span (exact outputs
  // the grader compares, names, operators) is the same in both languages.
  it('Hinglish keeps every code span of the English', () => {
    const spans = (text = '') =>
      (text.match(/`[^`]+`/g) ?? []).sort().join(' | ');
    for (const course of loadAllContent(REAL_CONTENT)) {
      for (const lesson of course.units.flatMap((u) => u.lessons)) {
        const where = `${course.slug}/${lesson.slug}`;
        if (lesson.exercise.promptHi !== null) {
          expect(spans(lesson.exercise.promptHi), where).toBe(
            spans(lesson.exercise.prompt),
          );
        }
        for (const card of lesson.learn?.cards ?? []) {
          if (!card.hi) continue;
          expect(spans(card.hi.body), where).toBe(spans(card.body));
          expect(spans(card.hi.fix), where).toBe(spans(card.bug?.fix));
        }
        for (const rule of [
          ...(lesson.exercise.checks ?? []),
          ...(lesson.exercise.gitScenario?.checks ?? []),
        ]) {
          if (rule.labelHi !== undefined) {
            expect(spans(rule.labelHi), where).toBe(spans(rule.label));
          }
        }
        const check = lesson.learn?.check;
        if (check?.hi) {
          expect(spans(check.hi.explanation), where).toBe(
            spans(check.explanation),
          );
        }
      }
    }
  });

  // The batches done so far (web: HINGLISH_COURSES in
  // components/lesson-language-picker.tsx).
  it.each([
    ['python', 47],
    ['javascript', 25],
    ['html-css', 15],
    ['git-github', 15],
  ])('every %s lesson has Hinglish', (slug, total) => {
    const course = loadAllContent(REAL_CONTENT).find((c) => c.slug === slug)!;
    const lessons = course.units.flatMap((u) => u.lessons);
    expect(lessons).toHaveLength(total);
    for (const lesson of lessons) {
      expect(lesson.exercise.promptHi, lesson.slug).not.toBeNull();
    }
  });
});

describe('checkpoint projects (ADR-043)', () => {
  const project = {
    ...validLesson,
    slug: 'project-sum',
    title: 'Project: Sum',
    position: 2,
    project: true,
  };

  it('a lesson is a project only when it says so', () => {
    expect(parseLesson(validLesson, 'x.json').project).toBe(false);
    expect(parseLesson(project, 'x.json').project).toBe(true);
  });

  it('a project has no Learn step', () => {
    expect(() =>
      parseLesson({ ...project, learn: validLearn }, 'x.json'),
    ).toThrow(/no learn step/);
  });

  it('a project is the last lesson of its unit, and there is only one', () => {
    const root = mkdtempSync(join(tmpdir(), 'projects-'));
    const write = (name: string, json: object) =>
      writeFileSync(join(root, 'course', 'unit', name), JSON.stringify(json));
    try {
      mkdirSync(join(root, 'course', 'unit'), { recursive: true });
      writeFileSync(
        join(root, 'course', 'course.json'),
        JSON.stringify({ slug: 'c', title: 'C', language: 'python' }),
      );
      write('unit.json', { slug: 'u', title: 'U', position: 1 });
      write('a.json', { ...validLesson, position: 1 });
      write('b.json', { ...project, position: 3 });
      expect(loadAllContent(root)[0].units[0].lessons.at(-1)?.project).toBe(
        true,
      );
      write('c.json', { ...validLesson, slug: 'later', position: 4 });
      expect(() => loadAllContent(root)).toThrow(/at most one project/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(['python', 'javascript'])(
    'every %s unit ends with one project',
    (slug) => {
      const course = loadAllContent(REAL_CONTENT).find((c) => c.slug === slug)!;
      for (const unit of course.units) {
        expect(
          unit.lessons.filter((l) => l.project),
          unit.slug,
        ).toHaveLength(1);
        expect(unit.lessons.at(-1)?.project, unit.slug).toBe(true);
      }
    },
  );
});
