'use client';

import type { LessonDetail } from '@loophole/shared';
import { ArrowLeft, Lock, RotateCcw, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Byte, ByteSays } from '@/components/byte';
import { CodeEditor } from '@/components/code-editor';
import { InlineCode } from '@/components/inline-code';
import { SampleTests } from '@/components/sample-tests';
import { TestResults } from '@/components/test-results';
import { TutorPanel } from '@/components/tutor-panel';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { useLesson } from '@/lib/queries/use-lessons';
import { useSubmissions, useSubmit } from '@/lib/queries/use-submissions';
import { useCountUp } from '@/lib/use-count-up';
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
          className="mb-6 inline-flex items-center gap-1 rounded-badge text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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

  // A first completion (XP paid) gets confetti; a repeat pass does not.
  useEffect(() => {
    if (result && result.xpAwarded > 0) celebrate();
  }, [result]);
  const completed = result?.lessonCompleted ?? false;

  return (
    <article className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-extrabold">{lesson.title}</h1>
      {/* Byte reads out the task (DESIGN_SYSTEM §9). */}
      <ByteSays>
        <p className="text-xs font-bold tracking-wide text-text-secondary uppercase">
          Your task
        </p>
        <p className="text-lg">
          <InlineCode text={prompt} />
        </p>
      </ByteSays>

      <SampleTests tests={sampleTests} />

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
        <p
          role="alert"
          className="rounded-card border-2 border-ink bg-surface px-4 py-3 font-bold"
        >
          {submit.error.message}
        </p>
      )}

      {completed && (
        <div
          role="status"
          className={`${stickerCard} flex flex-wrap items-center justify-between gap-4 bg-lemon px-6 py-4`}
        >
          <Byte mood="happy" className="size-16 shrink-0" />
          <div className="mr-auto">
            <p className="flex flex-wrap items-center gap-3 font-display text-2xl font-extrabold">
              Lesson complete!
              {result && result.xpAwarded > 0 && (
                <XpGain amount={result.xpAwarded} />
              )}
            </p>
            <p className="font-semibold">
              {result?.certificateSlug
                ? 'You finished the whole course. Your certificate is ready.'
                : 'Your next lesson is waiting on the path.'}
            </p>
          </div>
          {result?.certificateSlug ? (
            <Link
              href={`/c/${result.certificateSlug}`}
              className={primaryButton}
            >
              View certificate
            </Link>
          ) : (
            <Link href="/learn" className={primaryButton}>
              Continue
            </Link>
          )}
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

// "+10 XP", counting up from 0 (DESIGN_SYSTEM §5: XP count-up).
function XpGain({ amount }: { amount: number }) {
  const shown = useCountUp(amount, { from: 0 });
  return (
    <span className={`${chip} bg-paper text-base text-ink tabular-nums`}>
      <Zap className="size-4" fill="currentColor" aria-hidden />+{shown} XP
      <span className="sr-only">(+{amount} XP)</span>
    </span>
  );
}

function LessonError({ error }: { error: Error }) {
  const locked = error instanceof ApiError && error.code === 'LESSON_LOCKED';

  return (
    <div
      role="alert"
      className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-12 text-center`}
    >
      {locked ? (
        <Lock className="size-8" strokeWidth={2.5} />
      ) : (
        <Byte mood="oops" className="size-20" />
      )}
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
