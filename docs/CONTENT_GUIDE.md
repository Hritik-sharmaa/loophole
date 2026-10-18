# Loophole — Content Guide

Lessons and duel problems are JSON files in `content/`, loaded by the seed script (`pnpm --filter @loophole/api db:seed`). The seed is idempotent: it upserts by `slug`.

## 1. Folder layout

```
content/
  python/
    course.json
    01-basics/
      unit.json
      01-hello-world.json
      02-variables.json
    02-conditionals/
      unit.json
      ...
  duels/
    python/
      off-by-one-sum.json
      ...
```

## 2. Course and unit files

```json
// content/python/course.json
{ "slug": "python", "title": "Python Basics", "language": "python" }
```

```json
// content/python/01-basics/unit.json
{ "slug": "basics", "title": "The basics", "position": 1 }
```

## 3. Lesson file (one exercise per lesson)

```json
{
  "slug": "sum-two-numbers",
  "title": "Add two numbers",
  "position": 3,
  "exercise": {
    "prompt": "Read two integers from input, one per line, and print their sum.",
    "starterCode": "a = int(input())\nb = int(input())\n# print the sum below\n",
    "sampleTests": [{ "input": "2\n3\n", "expectedOutput": "5" }],
    "hiddenTests": [
      { "input": "0\n0\n", "expectedOutput": "0" },
      { "input": "-4\n10\n", "expectedOutput": "6" },
      { "input": "1000000\n1\n", "expectedOutput": "1000001" }
    ]
  }
}
```

### Grading rule

Each test runs the program with `input` as stdin. It passes when **trimmed stdout equals trimmed `expectedOutput`** (trailing whitespace and a final newline ignored). Exact match, not "contains".

### Writing good exercises

- One concept per exercise; the prompt fits in three sentences.
- At least 1 sample test and 3 hidden tests, including an edge case (zero, negative, empty, large).
- Starter code runs without errors, even if it fails tests.
- Use stdin/stdout only; no files, network or randomness.
- Write the reference solution during authoring and check it passes every test before committing. Keep it out of `content/`: it goes in `content-solutions/<course>/<unit-folder>/<lesson-file>.py`, which is git-ignored.
- `content-files.spec.ts` in the API parses the real `content/` folder in CI, so a malformed lesson file fails the build, not the seed.

## 4. v1 Python track (40 exercises, complete)

| Unit           | Topics                                    | Lessons |
| -------------- | ----------------------------------------- | ------- |
| 1 Basics       | print, input, variables, arithmetic       | 6       |
| 2 Conditionals | if / elif / else, comparisons, booleans   | 6       |
| 3 Loops        | for, while, range, break                  | 7       |
| 4 Strings      | indexing, slicing, methods, f-strings     | 6       |
| 5 Lists        | append, loops over lists, sum / min / max | 6       |
| 6 Functions    | def, return, parameters                   | 5       |
| 7 Dictionaries | keys, values, counting                    | 4       |

## 5. Duel problem file

```json
{
  "slug": "off-by-one-sum",
  "title": "Sum to N",
  "language": "python",
  "difficulty": 1,
  "description": "Print the sum of all integers from 1 to N inclusive, where N is read from input.",
  "buggyCode": "n = int(input())\ntotal = 0\nfor i in range(1, n):\n    total += i\nprint(total)\n",
  "bugCount": 1,
  "sampleTests": [{ "input": "3\n", "expectedOutput": "6" }],
  "hiddenTests": [
    { "input": "1\n", "expectedOutput": "1" },
    { "input": "10\n", "expectedOutput": "55" },
    { "input": "100\n", "expectedOutput": "5050" }
  ]
}
```

### Writing good duel problems

- Start from a correct program, then inject 1–3 realistic bugs (off-by-one, wrong operator, wrong variable, missing return, bad condition).
- The buggy code must run without crashing on at least one test, so both players see partial progress.
- Solvable by an intermediate learner in 2–4 minutes.
- At least 15 problems before S7 ends: 6 at difficulty 1, 6 at 2, 3 at 3. (Done: `content/duels/python/`, checked in CI by `content-files.spec.ts`.)
- Keep the fixed program in `content-solutions/duels/<language>/<slug>.py` (git-ignored), and check it in Piston before committing: the solution passes every test, and the buggy code passes at least one and fails at least one, so both players see partial progress.
- `bugCount` is for authors only; the seed does not store it.
