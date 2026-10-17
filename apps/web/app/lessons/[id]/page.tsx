'use client';

import type { LessonDetail } from '@loophole/shared';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { InlineCode } from '@/components/inline-code';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { ApiError } from '@/lib/api';
import { useLesson } from '@/lib/queries/use-lessons';
import { useRequireSession } from '@/lib/use-require-session';

// One exercise: prompt, starter code and sample tests. Read-only for now;
// the editor and Run button arrive in S3.
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireSession();
  const lesson = useLesson(id, !loading);

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
        ) : (
          <Exercise lesson={lesson.data} />
        )}
      </main>
    </>
  );
}

function Exercise({ lesson }: { lesson: LessonDetail }) {
  const { prompt, starterCode, sampleTests } = lesson.exercise;

  return (
    <article className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-extrabold">{lesson.title}</h1>
      <p className="text-lg">
        <InlineCode text={prompt} />
      </p>

      <section className="overflow-hidden rounded-card border-2 border-ink">
        <h2 className="border-b-2 border-ink px-4 py-2 font-mono text-sm font-bold">
          main.py
        </h2>
        <pre className="overflow-x-auto px-4 py-4 font-mono text-sm leading-6">
          {starterCode || ' '}
        </pre>
      </section>

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

      <div className="flex items-center gap-3">
        <button type="button" disabled className={primaryButton}>
          Run
        </button>
        <span className="text-sm text-text-secondary">
          The editor arrives in the next update.
        </span>
      </div>
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
