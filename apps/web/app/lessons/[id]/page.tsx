'use client';

import type { LessonDetail } from '@loophole/shared';
import { ArrowLeft, Lock, RotateCcw, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { CodeEditor } from '@/components/code-editor';
import { InlineCode } from '@/components/inline-code';
import { TestResults } from '@/components/test-results';
import { TutorPanel } from '@/components/tutor-panel';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { ApiError } from '@/lib/api';
import { useLesson } from '@/lib/queries/use-lessons';
import { useSubmissions, useSubmit } from '@/lib/queries/use-submissions';
import { useRequireSession } from '@/lib/use-require-session';

// One exercise: prompt, sample tests, editor, Run, and the graded result.
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireSession();
  const lesson = useLesson(id, !loading);
  // The editor starts from the user's latest attempt, if any.
  const history = useSubmissions(lesson.data?.exercise.id, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Link
          href="/learn"
          className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-text-secondary"
        >
          <ArrowLeft className="size-4" strokeWidth={3} /> Back to the path
        </Link>

        {loading || lesson.isPending ? (
          <p className="text-text-secondary">Loading the lesson…</p>
        ) : lesson.isError ? (
          <LessonError error={lesson.error} />
        ) : history.isPending ? (
          <p className="text-text-secondary">Loading your code…</p>
        ) : (
          <Exercise
            key={lesson.data.id}
            lesson={lesson.data}
            // A failed history load just means starting from the starter code.
            initialCode={
              history.data?.[0]?.code ?? lesson.data.exercise.starterCode
            }
          />
        )}
      </main>
    </>
  );
}

function Exercise({
  lesson,
  initialCode,
}: {
  lesson: LessonDetail;
  initialCode: string;
}) {
  const { id: exerciseId, prompt, starterCode, sampleTests } = lesson.exercise;
  const [code, setCode] = useState(initialCode);
  const submit = useSubmit();
  const result = submit.data;
  const completed = result?.lessonCompleted ?? false;

  return (
    <article className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-extrabold">{lesson.title}</h1>
      <p className="text-lg">
        <InlineCode text={prompt} />
      </p>

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
            {sampleTests.map((test, i) => (
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

      <CodeEditor value={code} onChange={setCode} fileName="main.py" />

      <div className="flex flex-wrap items-center gap-3">
        {/* One orange button per region: Continue takes over once passed. */}
        <button
          type="button"
          onClick={() => submit.mutate({ exerciseId, code })}
          disabled={submit.isPending}
          className={completed ? secondaryButton : primaryButton}
        >
          {submit.isPending ? 'Running…' : 'Run'}
        </button>
        <button
          type="button"
          onClick={() => setCode(starterCode)}
          disabled={submit.isPending || code === starterCode}
          className={secondaryButton}
        >
          <RotateCcw className="size-4" strokeWidth={3} /> Reset code
        </button>
      </div>

      {submit.isError && (
        <p role="alert" className="rounded-card bg-surface px-4 py-3 font-bold">
          {submit.error.message}
        </p>
      )}

      {completed && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-ink px-6 py-4"
        >
          <div>
            <p className="flex flex-wrap items-center gap-3 font-display text-2xl font-extrabold">
              Lesson complete!
              {result && result.xpAwarded > 0 && (
                <span className="flex items-center gap-1 rounded-badge bg-orange px-2 py-0.5 text-base text-ink">
                  <Zap className="size-4" fill="currentColor" aria-hidden />+
                  {result.xpAwarded} XP
                </span>
              )}
            </p>
            <p className="text-text-secondary">
              Your next lesson is waiting on the path.
            </p>
          </div>
          <Link href="/learn" className={primaryButton}>
            Continue
          </Link>
        </div>
      )}

      {result && <TestResults result={result} />}

      {/* After the results, so Explain sits under the error it explains. */}
      {!completed && (
        <TutorPanel exerciseId={exerciseId} code={code} submission={result} />
      )}
    </article>
  );
}

function LessonError({ error }: { error: Error }) {
  const locked = error instanceof ApiError && error.code === 'LESSON_LOCKED';

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-card bg-surface px-6 py-12 text-center"
    >
      {locked && <Lock className="size-8" strokeWidth={2.5} />}
      <p className="font-display text-2xl font-extrabold">
        {locked ? 'Finish the previous lesson first' : 'Lesson not available'}
      </p>
      {!locked && <p className="text-text-secondary">{error.message}</p>}
      <Link href="/learn" className={locked ? primaryButton : secondaryButton}>
        Back to the path
      </Link>
    </div>
  );
}
