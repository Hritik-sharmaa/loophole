import { runInNewContext } from 'node:vm';
import { withProgramHelpers } from '../program-helpers.js';

describe('withProgramHelpers', () => {
  it('leaves Python untouched', () => {
    expect(withProgramHelpers('python', 'print(input())\n')).toBe(
      'print(input())\n',
    );
  });

  it("adds prompt() after a JavaScript program, keeping the learner's lines first", () => {
    const code = 'console.log(prompt());\n// a last comment';
    const program = withProgramHelpers('javascript', code);
    expect(program.startsWith(`${code}\n`)).toBe(true);
    expect(program).toContain('function prompt()');
  });

  it('reads stdin through prompt(), line by line, null at the end', () => {
    // Run the helper in-process with a fake stdin to check its logic.
    const program = withProgramHelpers(
      'javascript',
      'out.push(prompt(), prompt("ignored message"), prompt(), prompt());',
    );
    const out: unknown[] = [];
    const fakeRequire = () => ({ readFileSync: () => 'Ada\r\n42\n' });
    runInNewContext(program, { out, require: fakeRequire });
    // "Ada\r\n42\n" splits into "Ada", "42", "" and then nothing.
    expect(out).toEqual(['Ada', '42', '', null]);
  });
});
