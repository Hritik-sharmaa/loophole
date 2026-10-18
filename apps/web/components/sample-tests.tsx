import type { TestCase } from '@loophole/shared';

// The "Example" table: input and expected output for each sample test.
// Used by lessons and duels; hidden tests never reach the browser.
export function SampleTests({ tests }: { tests: TestCase[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold">Example</h2>
      <table className="w-full overflow-hidden rounded-card bg-surface text-left font-mono text-sm">
        <thead className="text-xs tracking-wide text-text-secondary uppercase">
          <tr>
            <th className="px-4 py-2 font-bold">Input</th>
            <th className="px-4 py-2 font-bold">Expected output</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test, i) => (
            <tr key={i} className="border-t border-border-muted align-top">
              <td className="px-4 py-2 whitespace-pre">
                {test.input.trimEnd() || (
                  <span className="text-text-secondary">(no input)</span>
                )}
              </td>
              <td className="px-4 py-2 whitespace-pre">
                {test.expectedOutput}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
