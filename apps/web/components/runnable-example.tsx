'use client';

import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { CodeEditor } from '@/components/code-editor';
import { secondaryButton } from '@/components/ui/buttons';
import { useRun } from '@/lib/queries/use-run';

// A Learn example: code the learner can edit and run (POST /runs, ungraded).
// Before any run it shows what the unedited code prints, so the card
// teaches even when the code runner is down.
export function RunnableExample({
  lessonId,
  code: original,
  input,
  output,
}: {
  lessonId: string;
  code: string;
  input?: string;
  output?: string;
}) {
  // Without the trailing newline, so the editor shows no empty last line.
  const start = original.trimEnd();
  const [code, setCode] = useState(start);
  const run = useRun();
  const result = run.data;

  return (
    <div className="flex flex-col gap-3">
      <CodeEditor
        value={code}
        onChange={setCode}
        fileName="example.py"
        compact
      />

      {input && (
        <p className="text-sm text-text-secondary">
          Typed in when it asks for input:{' '}
          <code className="rounded-badge border border-border-muted bg-surface px-1.5 py-0.5 font-mono text-ink">
            {input.trimEnd().replaceAll('\n', ' ⏎ ')}
          </code>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run.mutate({ lessonId, code, input })}
          disabled={run.isPending}
          className={`${secondaryButton} px-4 py-2 text-sm`}
        >
          <Play className="size-4" strokeWidth={3} aria-hidden />
          {run.isPending ? 'Running…' : 'Run it'}
        </button>
        {code !== start && (
          <button
            type="button"
            onClick={() => {
              setCode(start);
              run.reset();
            }}
            className="inline-flex items-center gap-1 rounded-badge px-2 py-1 text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <RotateCcw className="size-3.5" strokeWidth={3} aria-hidden /> Undo
            my changes
          </button>
        )}
      </div>

      <div aria-live="polite">
        {run.isError ? (
          <p role="alert" className="text-sm font-bold">
            {run.error.message}
          </p>
        ) : result ? (
          <Console
            label="Output"
            stdout={result.stdout}
            stderr={result.stderr}
          />
        ) : (
          output !== undefined && (
            <Console label="Prints" stdout={output} stderr="" />
          )
        )}
      </div>
    </div>
  );
}

// An Ink "terminal" with what the program printed, then any error.
function Console({
  label,
  stdout,
  stderr,
}: {
  label: string;
  stdout: string;
  stderr: string;
}) {
  return (
    <div className="overflow-hidden rounded-card border-2 border-ink bg-ink">
      <p className="border-b border-screen px-4 py-1.5 text-xs font-bold tracking-wide text-border-muted uppercase">
        {label}
      </p>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-sm leading-6 whitespace-pre-wrap text-canvas">
        {stdout.trimEnd() || (stderr ? '' : '(nothing printed)')}
        {stderr && <span className="block text-pink">{stderr.trimEnd()}</span>}
      </pre>
    </div>
  );
}
