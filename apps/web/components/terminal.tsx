'use client';

import type { GitRunResponse, GitTranscriptLine } from '@loophole/shared';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useGitRun } from '@/lib/queries/use-git-run';

// The practice terminal for git lessons (ADR-026). Every Enter sends ALL
// the commands typed so far to POST /git/run, which replays the lesson's
// hidden setup and then them, and returns each command's output. Nothing
// runs in the browser and nothing real runs on the server: it is a
// simulation. `clear` only clears the screen; the commands still count.
export function Terminal({
  lessonId,
  commands,
  onCommandsChange,
}: {
  lessonId: string;
  commands: string[];
  onCommandsChange: (commands: string[]) => void;
}) {
  const run = useGitRun();
  const [response, setResponse] = useState<GitRunResponse | null>(null);
  // The commands that were on screen when `clear` was typed.
  const [cleared, setCleared] = useState<string[] | null>(null);
  const [line, setLine] = useState('');
  // Position while browsing earlier commands with ↑ / ↓.
  const [recall, setRecall] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { mutate } = run;

  // Replays whenever the command list changes (including on first load,
  // when it comes from the learner's last submission).
  useEffect(() => {
    if (commands.length === 0) return;
    mutate(
      { lessonId, commands: commands.join('\n') },
      { onSuccess: setResponse },
    );
  }, [commands, lessonId, mutate]);

  // With no commands (a fresh start, or after "Start over") the screen is
  // empty, whatever the last response was.
  const transcript: GitTranscriptLine[] = commands.length
    ? (response?.transcript ?? [])
    : [];
  const cwd = commands.length ? (response?.cwd ?? '') : '';
  // `clear` hides the lines it saw, as long as they are still the first
  // commands (after "Start over" they no longer are).
  const hidden =
    cleared &&
    cleared.length <= commands.length &&
    cleared.every((c, i) => commands[i] === c)
      ? cleared.length
      : 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [response, commands.length, run.isPending]);

  function submit(event: FormEvent) {
    event.preventDefault();
    // Not disabled while busy (that would drop keyboard focus); a command
    // typed during a replay waits until it finishes.
    if (run.isPending) return;
    const typed = line.trim();
    setLine('');
    setRecall(null);
    // A # line is a comment: the simulator skips it, so it isn't kept.
    if (!typed || typed.startsWith('#')) return;
    if (typed === 'clear') {
      setCleared(commands);
      return;
    }
    onCommandsChange([...commands, typed]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (commands.length === 0) return;
    event.preventDefault();
    const from = recall ?? commands.length;
    const next =
      event.key === 'ArrowUp'
        ? Math.max(0, from - 1)
        : Math.min(commands.length, from + 1);
    setRecall(next);
    setLine(commands[next] ?? '');
  }

  const prompt = `you@loophole:~${cwd ? `/${cwd}` : ''}$`;

  return (
    <section
      className="flex min-w-0 flex-col overflow-hidden rounded-card border-2 border-ink bg-ink shadow-sticker"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-3 border-b border-screen px-4 py-2">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-orange" />
          <span className="size-2.5 rounded-full bg-lemon" />
          <span className="size-2.5 rounded-full bg-pink" />
        </span>
        <h2 className="font-mono text-sm font-bold text-paper">
          Terminal <span className="text-border-muted">· practice mode</span>
        </h2>
      </div>

      <div
        className="flex h-80 flex-col gap-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-6 text-canvas"
        aria-live="polite"
      >
        {transcript.length === 0 && !run.isPending && (
          <p className="text-border-muted">
            Type a command and press Enter. Try <code>ls</code> or{' '}
            <code>git status</code>.
          </p>
        )}
        {transcript.slice(hidden).map((step, i) => (
          <div key={hidden + i}>
            <p className="break-all">
              <span className="text-orange" aria-hidden>
                ${' '}
              </span>
              {step.command}
            </p>
            {step.output && (
              <pre className="whitespace-pre-wrap break-words text-border-muted">
                {step.output}
              </pre>
            )}
          </div>
        ))}
        {run.isError && (
          <p role="alert" className="text-pink">
            {run.error.message}
          </p>
        )}

        <form onSubmit={submit} className="flex items-center gap-2">
          <label htmlFor="terminal-input" className="shrink-0 text-orange">
            {prompt}
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={500}
            className="min-w-0 flex-1 bg-transparent text-paper caret-orange outline-none"
          />
        </form>
        <div ref={endRef} />
      </div>
    </section>
  );
}
