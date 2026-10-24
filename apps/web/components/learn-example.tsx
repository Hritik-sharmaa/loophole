'use client';

import type { ExerciseKind } from '@loophole/shared';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { CodeEditor } from '@/components/code-editor';
import { secondaryButton } from '@/components/ui/buttons';
import { WebPreview } from '@/components/web-preview';
import { languageInfo } from '@/lib/languages';
import { useGitRun } from '@/lib/queries/use-git-run';
import { useRun } from '@/lib/queries/use-run';

// A Learn example. Program courses: code the learner can edit and run
// (POST /runs, ungraded). Web courses (ADR-024): HTML that redraws in a
// live preview as the learner edits it; nothing is sent to the server.
export function LearnExample(props: {
  kind: ExerciseKind;
  // The course language: picks the editor's highlighting and file name.
  language: string;
  lessonId: string;
  code: string;
  input?: string;
  output?: string;
}) {
  if (props.kind === 'git') {
    return <GitExample lessonId={props.lessonId} code={props.code} />;
  }
  return props.kind === 'web' ? (
    <WebExample code={props.code} />
  ) : (
    <RunnableExample {...props} />
  );
}

// Git (ADR-026): commands, one per line, replayed in the simulated
// terminal from an empty folder (POST /git/run with fresh: true).
function GitExample({
  lessonId,
  code: original,
}: {
  lessonId: string;
  code: string;
}) {
  const start = original.trimEnd();
  const [code, setCode] = useState(start);
  const run = useGitRun();

  return (
    <div className="flex flex-col gap-3">
      <CodeEditor
        value={code}
        onChange={setCode}
        fileName="commands"
        language="plain"
        compact
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run.mutate({ lessonId, commands: code, fresh: true })}
          disabled={run.isPending}
          className={`${secondaryButton} px-4 py-2 text-sm`}
        >
          <Play className="size-4" strokeWidth={3} aria-hidden />
          {run.isPending ? 'Running…' : 'Run it'}
        </button>
        {code !== start && (
          <UndoButton
            onClick={() => {
              setCode(start);
              run.reset();
            }}
          />
        )}
      </div>
      <div aria-live="polite">
        {run.isError && (
          <p role="alert" className="text-sm font-bold">
            {run.error.message}
          </p>
        )}
        {run.data && (
          <div className="overflow-hidden rounded-card border border-ink bg-ink">
            <p className="border-b border-screen px-4 py-1.5 text-xs font-bold tracking-wide text-border-muted uppercase">
              Terminal
            </p>
            <div className="flex flex-col gap-1 overflow-x-auto px-4 py-3 font-mono text-sm leading-6 text-canvas">
              {run.data.transcript.map((step, i) => (
                <div key={i}>
                  <p>
                    <span className="text-sun" aria-hidden>
                      ${' '}
                    </span>
                    {step.command}
                  </p>
                  {step.output && (
                    <pre className="whitespace-pre-wrap text-border-muted">
                      {step.output}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WebExample({ code: original }: { code: string }) {
  const start = original.trimEnd();
  const [code, setCode] = useState(start);

  return (
    <div className="flex flex-col gap-3">
      <CodeEditor
        value={code}
        onChange={setCode}
        fileName="example.html"
        language="html"
        compact
      />
      <WebPreview html={code} className="h-40" />
      {code !== start && <UndoButton onClick={() => setCode(start)} />}
    </div>
  );
}

// Before any run it shows what the unedited code prints, so the card
// teaches even when the code runner is down.
function RunnableExample({
  language,
  lessonId,
  code: original,
  input,
  output,
}: {
  language: string;
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
  const { editor, example } = languageInfo(language);

  return (
    <div className="flex flex-col gap-3">
      <CodeEditor
        value={code}
        onChange={setCode}
        fileName={example}
        language={editor}
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
          <UndoButton
            onClick={() => {
              setCode(start);
              run.reset();
            }}
          />
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
    <div className="overflow-hidden rounded-card border border-ink bg-ink">
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

function UndoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 self-start rounded-badge px-2 py-1 text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
    >
      <RotateCcw className="size-3.5" strokeWidth={3} aria-hidden /> Undo my
      changes
    </button>
  );
}
