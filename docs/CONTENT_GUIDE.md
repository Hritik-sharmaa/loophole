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
{
  "slug": "python",
  "title": "Python Basics",
  "language": "python",
  "description": "Start from zero: print, variables, decisions, loops, text, lists, functions and dictionaries, in 40 bite-sized lessons."
}
```

`description` is optional and shows on the course's card in the catalog at `/learn` (ADR-023). Keep it to one or two sentences.

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

### The Learn step (ADR-021)

Every lesson teaches before it tests. Put a `learn` block between `position` and `exercise`:

```json
"learn": {
  "cards": [
    {
      "title": "Reading input",
      "body": "`input()` reads one line that the user types and gives it back as text.",
      "code": "name = input()\nprint(name)\n",
      "input": "Ada\n",
      "output": "Ada"
    },
    { "title": "Every character counts", "body": "The grader compares your output letter by letter." }
  ],
  "check": {
    "question": "What does this print?",
    "code": "print(\"4\" + \"4\")\n",
    "options": ["8", "44", "An error"],
    "answer": 1,
    "explanation": "Both values are strings in quotes, so + joins them into 44."
  }
}
```

- **Cards:** 1–5 (aim for 2–3). One idea per card; `body` is two sentences at most and may use `backticks` for code. `code` is an example the learner can edit and run; it needs `output` (what the unedited code prints, shown before any run) and may have `input` (stdin). A card without `code` is text only.
- **Check:** one question with 2–4 different `options`; `answer` is the index of the right one. Prefer "What does this print?" with `code`. Wrong options should be mistakes a beginner would really make.
- **Teach, don't solve:** the cards build up to the exercise but never contain its solution. Use different names and numbers from the exercise.
- **Check before committing:** run every example and the check through Piston, and confirm each `output` (and the right option) matches exactly. The Python track's 133 programs were checked this way.
- `content-files.spec.ts` checks the shape in CI and that every lesson has a `learn` block.

### Grading rule

Each test runs the program with `input` as stdin. It passes when **trimmed stdout equals trimmed `expectedOutput`** (trailing whitespace and a final newline ignored). Exact match, not "contains".

### Writing good exercises

- One concept per exercise; the prompt fits in three sentences.
- At least 1 sample test and 3 hidden tests, including an edge case (zero, negative, empty, large).
- Starter code runs without errors, even if it fails tests.
- Use stdin/stdout only; no files, network or randomness.
- Write the reference solution during authoring and check it passes every test before committing. Keep it out of `content/`: it goes in `content-solutions/<course>/<unit-folder>/<lesson-file>.py`, which is git-ignored.
- `content-files.spec.ts` in the API parses the real `content/` folder in CI, so a malformed lesson file fails the build, not the seed.

### Web exercises: the HTML & CSS track (ADR-024)

A course whose `language` is `html` has web exercises: the learner writes one page (HTML, with CSS in a `<style>` tag) beside a live preview, and the API checks it against rules. Instead of `sampleTests` and `hiddenTests`, the exercise has `checks`:

```json
"exercise": {
  "prompt": "Add a `<style>` tag and make the `<h1>` orange with the `color` property.",
  "starterCode": "<h1>Welcome</h1>\n",
  "checks": [
    { "type": "element", "label": "There is a `<style>` tag", "selector": "style" },
    { "type": "element", "label": "The `<h1>` says `Welcome`", "selector": "h1", "text": "Welcome" },
    { "type": "element", "label": "A `<ul>` holds at least three items", "selector": "ul > li", "min": 3 },
    { "type": "attribute", "label": "A link goes to `https://example.com`", "selector": "a", "name": "href", "value": "https://example.com" },
    { "type": "style", "label": "The `<h1>` has `color: orange`", "selector": "h1", "property": "color", "value": ["orange", "#ffa500"] }
  ]
}
```

- **element:** at least `min` (default 1) elements match the CSS `selector`; with `text`, only those whose text (whitespace collapsed) is exactly that count.
- **attribute:** some matching element has the attribute; with `value`, exactly that value (trimmed).
- **style:** every matching element (at least one) ends up with one of the accepted values for `property`. The checker applies the cascade (`!important`, specificity, order, `style=""`) but no inheritance or browser defaults, so check the element the prompt tells the learner to style, and the property it names (`padding`, not `padding-top`). List every common spelling of a value (`yellow`, `#ffff00`, `#ff0`). Values compare in lower case with quotes and extra spaces removed.
- **Labels** are the checklist the learner sees, all of it, from the start; use `backticks` for code. There are no hidden checks: meeting the checks is the exercise.
- Learn examples in a web course have `code` only (no `input` or `output`): they show in a live preview.
- CI checks that every selector parses and that no starter code already passes every check. Keep a reference solution in `content-solutions/<course>/<unit-folder>/<lesson-file>.html` and check it passes before committing.

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
