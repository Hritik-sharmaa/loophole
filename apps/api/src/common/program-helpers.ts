// Small helpers Loophole adds to a learner's program before it runs in
// Piston (ADR-025). They go AFTER the learner's code, so error line numbers
// still match what the learner wrote.

// JavaScript has no built-in way to read a line of stdin, so the course
// uses prompt(), the browser's own "ask the user for text": it returns the
// next line of input, or null when there is none, like a cancelled
// browser prompt. A function declaration is hoisted, so prompt() works
// from the first line. Its message argument is ignored: printing it would
// break the exact-match grading.
const JS_PROMPT = `
// Added by Loophole: prompt() reads the next line of input.
function prompt() {
  if (!prompt.lines) {
    prompt.lines = require('fs').readFileSync(0, 'utf8').split('\\n');
    prompt.next = 0;
  }
  const line = prompt.lines[prompt.next++];
  return line === undefined ? null : line.replace(/\\r$/, '');
}
`;

// The code Piston should run for `language`.
export function withProgramHelpers(language: string, code: string): string {
  // The leading newline ends a final // comment without a line break.
  return language === 'javascript' ? `${code}\n${JS_PROMPT}` : code;
}
