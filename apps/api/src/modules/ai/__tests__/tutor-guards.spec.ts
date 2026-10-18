import { containsCodeBlock, limitWords, validLine } from '../tutor-guards.js';

describe('limitWords (FR-12)', () => {
  it('keeps short text as it is', () => {
    expect(limitWords('  You forgot the colon.  ')).toBe(
      'You forgot the colon.',
    );
  });

  it('cuts text over the limit at a word boundary', () => {
    const long = Array.from({ length: 130 }, (_, i) => `w${i}`).join(' ');
    const cut = limitWords(long);
    expect(cut.split(' ')).toHaveLength(120);
    expect(cut.endsWith('w119…')).toBe(true);
  });
});

describe('containsCodeBlock (FR-13)', () => {
  it.each([
    ['a prose hint', 'What does `input()` give you back: a number or text?'],
    ['one line of code', 'Try something like:\nprint(a + b)\nDoes that help?'],
    [
      'three code lines',
      'Look at this shape:\nfor x in xs:\n    total += x\nprint(total)',
    ],
    ['prose with brackets', 'Remember (as in maths) that order matters.'],
  ])('allows %s', (_case, text) => {
    expect(containsCodeBlock(text)).toBe(false);
  });

  it.each([
    [
      'four unfenced code lines',
      'Here:\na = int(input())\nb = int(input())\ntotal = a + b\nprint(total)',
    ],
    [
      'a fenced block of four lines',
      '```python\nname = input()\nif name:\n    greeting = "Hi"\nprint(greeting)\n```',
    ],
    [
      'an indented solution',
      'def solve():\n    a = 1\n    b = 2\n    return a + b',
    ],
  ])('flags %s', (_case, text) => {
    expect(containsCodeBlock(text)).toBe(true);
  });
});

describe('validLine', () => {
  const code = 'a = 1\nb = 2\nprint(a + b)';
  it.each([
    [null, null],
    [1, 1],
    [3, 3],
    [0, null],
    [4, null],
    [-2, null],
  ])('%s → %s', (line, expected) => {
    expect(validLine(line, code)).toBe(expected);
  });
});
