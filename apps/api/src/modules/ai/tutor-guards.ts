// Checks on what the tutor says, applied after Gemini answers
// (docs/AI_TUTOR.md §5). The prompt asks for the same things; these make
// sure of it.

export const MAX_WORDS = 120;

// More consecutive code lines than this means the hint is giving the
// answer away (FR-13).
export const MAX_CODE_LINES = 3;

export const GENERIC_HINT =
  'Read the exercise again and compare it with what your program prints for the example. Which line produces the output, and what does it need to print instead?';

// A line that reads as code rather than prose: indented, a Python keyword
// at the start, an assignment, or a call / open bracket at the end. (Not a
// trailing colon: prose ends with one too, and Python lines that do start
// with a keyword.)
const CODE_LINE =
  /^\s{2,}\S|^\s*(def|for|while|if|elif|else|return|print|import|from|class|try|except)\b|^\s*[A-Za-z_]\w*\s*[+\-*/]?=[^=]|[({[]\s*$|\)\s*$/;

// FR-12: at most 120 words. Cuts at a word boundary and marks the cut.
export function limitWords(text: string, max = MAX_WORDS): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  return `${words.slice(0, max).join(' ')}…`;
}

// True when the text holds a block of more than MAX_CODE_LINES lines of
// code, fenced (```) or not.
export function containsCodeBlock(text: string): boolean {
  let run = 0;
  let inFence = false;
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    const isCode = inFence ? line.trim() !== '' : CODE_LINE.test(line);
    run = isCode ? run + 1 : 0;
    if (run > MAX_CODE_LINES) return true;
  }
  return false;
}

// The tutor's line number, kept only if it points at a real line.
export function validLine(line: number | null, code: string): number | null {
  if (line === null) return null;
  const lines = code.split('\n').length;
  return line >= 1 && line <= lines ? line : null;
}
