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

### Spot-the-bug cards (ADR-031)

A card with a `bug` is a spot-the-bug card: short code with exactly one wrong line, which the learner taps. It works in every course language, is never run (so no `input` or `output`), pays nothing and is checked in the browser like the quick check.

```json
{
  "title": "Spot the bug",
  "body": "Give it 3 and 4 and it prints 7 instead of 12. Which line is wrong?",
  "code": "width = int(input())\nheight = int(input())\narea = width + height\nprint(area)\n",
  "bug": {
    "line": 3,
    "fix": "Area is width times height. Line 3 should multiply with `*`, not add with `+`."
  }
}
```

- `line` is 1-based and must be a line of `code`; `fix` says what is wrong and how to fix it, in one or two sentences.
- **One bug only**, using only what the lesson (or earlier ones) taught. The body says the symptom ("prints 7 instead of 12", "stops with a `NameError`") so the learner reasons from it; when the error points at a different line than the cause, say so.
- Put it last, after the teaching cards, so it practises what they just taught. It counts toward the 1–5 cards.
- Bug cards stay out of the unit's cheat sheet and make up its **Bug hunt**, the review at the end of the unit. Every lesson has exactly one, as its last card; `content-files.spec.ts` checks that.

### Hinglish (ADR-042)

A lesson may carry Hinglish next to its English. It is all or nothing: every card, the check and the exercise, or none of them (the loader refuses half).

```json
{
  "title": "Text goes in quotes",
  "body": "Text in Python is called a string. ...",
  "code": "print(\"I am learning Python\")\n",
  "output": "I am learning Python",
  "hi": {
    "title": "Text quotes mein jaata hai",
    "body": "Python mein text ko string kehte hain. ..."
  }
}
```

- A card's `hi` has `title` and `body`, plus `fix` on a bug card (and only there). The check's `hi` has `question` and `explanation`, and `options` only when the options are words ("An error" → "Error aayega"), one per English option in the same order; output options stay as they are. The exercise has `promptHi` next to `prompt`, and every web or git check has `labelHi` next to its `label` (the checklist, which also comes back in graded results).
- Never translate code, inputs, outputs or tests. Every `code` span must appear in the Hinglish exactly as in the English: `content-files.spec.ts` checks it, because prompts hold the exact output the grader compares.
- Style: Roman script, friendly, "aap"; keep programming words in English (string, variable, loop, list, function, input, output) the way Indian teachers say them. "Spot the bug" is "Bug dhoondo"; "What does this print?" is "Yeh kya print karega?".
- Done: every course: `content/python` (40 lessons), `content/javascript` (20), `content/html-css` (15) and `content/git` (15). A new course gets its Hinglish with it: add it to `HINGLISH_COURSES` (web) and to the "every lesson has Hinglish" test. Every change to a lesson's English needs the Hinglish changed too.

### Grading rule

Each test runs the program with `input` as stdin. It passes when **trimmed stdout equals trimmed `expectedOutput`** (trailing whitespace and a final newline ignored). Exact match, not "contains".

### Writing good exercises

- One concept per exercise; the prompt fits in three sentences.
- At least 1 sample test and 3 hidden tests, including an edge case (zero, negative, empty, large).
- Starter code runs without errors, even if it fails tests.
- Use stdin/stdout only; no files, network or randomness.
- Write the reference solution during authoring and check it passes every test before committing. Keep it out of `content/`: it goes in `content-solutions/<course>/<unit-folder>/<lesson-file>.py`, which is git-ignored.
- `content-files.spec.ts` in the API parses the real `content/` folder in CI, so a malformed lesson file fails the build, not the seed.

### Git exercises (ADR-026)

A course with `language: "git"` has git exercises: the learner types commands into a simulated terminal, and the API replays them on a simulated repository and checks the result. Nothing real runs. The exercise has a hidden `setup` (commands that build the starting state) and `checks` instead of tests:

```json
"exercise": {
  "prompt": "The `footer` branch has a finished footer. Merge it into `main`.",
  "starterCode": "",
  "setup": [
    "git init",
    "echo '<h1>My site</h1>' > index.html",
    "git add .",
    "git commit -m \"Add home page\"",
    "git switch -c footer",
    "touch footer.html",
    "git add .",
    "git commit -m \"Add footer\""
  ],
  "checks": [
    { "type": "current-branch", "label": "You are on `main`", "name": "main" },
    { "type": "merged", "label": "`footer` is merged into `main`", "branch": "footer", "into": "main" }
  ]
}
```

- **The terminal knows:** `ls`, `pwd`, `cd`, `mkdir` (one level of folders), `touch`, `cat`, `echo … > file` / `>> file`, `rm`, and `git init, config, status, add, restore [--staged], commit [-a] -m, log [--oneline], branch [-d], switch [-c], checkout [-b], merge, remote [add|-v|remove], push [-u], pull, fetch, clone`. Merges that would conflict are refused; don't write lessons that need one.
- **Setup-only commands:** `@github <url>` creates an empty repository on the pretend GitHub; `@config-reset` clears `user.name` and `user.email` (they default to `Learner`). To put commits on GitHub, build them in a throwaway folder, push, then `rm -r` the folder (see `content/git/03-github`). Learners can never run `@` commands.
- **Checks** look at the folder the learner ends in: `repo`, `config` (`key`), `file` (`path`, `content?`), `folder` (`path`), `staged` (`path`, `staged?`), `clean`, `commits` (`min`, `branch?`), `commit-message` (`text`, `branch?`), `committed-file` (`path`, `content?`, `present?`, `branch?`), `branch` (`name`, `exists?`), `current-branch` (`name`), `merged` (`branch`, `into`), `remote` (`name`, `url?`), `pushed` (`remote`, `branch`). `branch` defaults to the current one.
- Learn examples have `code` only (commands); they run from an empty folder with no setup, so they can't use GitHub. Explain remote commands in text cards.
- The seed loader replays every setup and refuses one where any command prints an error. CI checks that an empty answer never passes. Keep a reference solution in `content-solutions/git/<unit-folder>/<lesson-file>.sh` and check it with `gradeGit()` before committing.

### JavaScript programs (ADR-025)

A course with `language: "javascript"` is graded exactly like Python (stdin in, trimmed stdout compared), in Piston's Node 20.11.1. JavaScript has no simple way to read stdin, so Loophole appends a `prompt()` helper after the learner's code: each call returns the next line of input as text (or `null` when there is none), like the browser's `prompt()`. Line numbers in errors are unchanged.

- Read input with `prompt()`, and numbers with `Number(prompt())`; a line of numbers is `prompt().split(" ").map(Number)`.
- Print with `console.log()`. Avoid printing arrays or objects directly (`[ 1, 2 ]` formatting is Node-specific); use `join(" ")`.
- Don't name anything `prompt`.
- Check every example, the quick check, the reference solution (`content-solutions/javascript/…/*.js`) and the starter code through Piston with `withProgramHelpers()` applied, as the API runs them. Docker Desktop sometimes stalls Node's start past the 3 s wall clock (status `TO` with little CPU time); re-run those before suspecting the content.

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
- At least 15 problems per language: 6 at difficulty 1, 6 at 2, 3 at 3. (Done: `content/duels/python/` and `content/duels/javascript/`, checked in CI by `content-files.spec.ts`.)
- Slugs are unique across languages: JavaScript problems start with `js-`. The folder name must match the file's `language`.
- JavaScript problems read input with `prompt()` (one line per call, ADR-025) and print with `console.log`. Prefer bugs JavaScript learners really meet: a number left as a string from `prompt()`, `sort()` without a compare function, `''.split(' ')` giving `['']`, a method named without `()`.
- Keep the fixed program in `content-solutions/duels/<language>/<slug>.py` (or `.js`; git-ignored), and check it in Piston before committing: the solution passes every test, and the buggy code passes at least one and fails at least one, so both players see partial progress.
- `bugCount` is for authors only; the seed does not store it.
