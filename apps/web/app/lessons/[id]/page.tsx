'use client';

import type { LessonDetail } from '@loophole/shared';
import { ArrowLeft, Check, Lock, RotateCcw, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Byte, ByteSays } from '@/components/byte';
import { CodeEditor } from '@/components/code-editor';
import { InlineCode } from '@/components/inline-code';
import { LearnCards } from '@/components/learn-cards';
import { QuickCheck } from '@/components/quick-check';
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

// One lesson: Learn cards and a quick check, then the exercise (prompt,
// sample tests, editor, Run, and the graded result).
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireSession();
  const lesson = useLesson(id, !loading);
  // The editor starts from the user's latest attempt, if any.
  const history = useSubmissions(lesson.data?.exercise.id, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
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
          <Lesson
            key={lesson.data.id}
            lesson={lesson.data}
            // A failed history load just means starting from the starter code.
            initialCode={
              history.data?.[0]?.code ?? lesson.data.exercise.starterCode
            }
            // Someone who already tried the exercise skips straight to it.
            startAt={history.data?.length ? 'practice' : 'learn'}
          />
        )}
      </main>
    </>
  );
}

type Step = 'learn' | 'check' | 'practice';

const STEPS: { id: Step; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'check', label: 'Check' },
  { id: 'practice', label: 'Practice' },
];

// Teach first, then test (ADR-021): Learn cards, a quick check, then the
// graded exercise. Every step stays mounted (only hidden), so moving
// between them keeps the code in the editor and the last result.
function Lesson({
  lesson,
  initialCode,
  startAt,
}: {
  lesson: LessonDetail;
  initialCode: string;
  startAt: Step;
}) {
  const learn = lesson.learn;
  const [step, setStep] = useState<Step>(learn ? startAt : 'practice');

  function go(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <article className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-extrabold text-balance sm:text-4xl">
        {lesson.title}
      </h1>

      {learn && (
        <>
          <Stepper current={step} onPick={go} />
          <div hidden={step !== 'learn'}>
            <LearnCards
              lessonId={lesson.id}
              cards={learn.cards}
              onDone={() => go('check')}
            />
          </div>
          <div hidden={step !== 'check'}>
            <QuickCheck check={learn.check} onDone={() => go('practice')} />
          </div>
        </>
      )}

      <div hidden={step !== 'practice'}>
        <Exercise lesson={lesson} initialCode={initialCode} />
      </div>
    </article>
  );
}

// Three steps as sticker tabs. Any step can be opened at any time: the
// Learn step teaches, it doesn't gate.
function Stepper({
  current,
  onPick,
}: {
  current: Step;
  onPick: (step: Step) => void;
}) {
  const at = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Lesson steps">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-current={s.id === current ? 'step' : undefined}
              className={`flex w-full items-center justify-center gap-1.5 rounded-card border-2 border-ink px-2 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${s.id === current ? 'bg-ink text-paper' : i < at ? 'bg-blue text-paper' : 'bg-paper text-ink'}`}
            >
              <span
                aria-hidden
                className="flex size-5 items-center justify-center rounded-node border-2 border-current text-[0.7rem]"
              >
                {i < at ? <Check className="size-3" strokeWidth={4} /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`hidden h-0.5 w-4 shrink-0 sm:block ${i < at ? 'bg-blue' : 'bg-border-muted'}`}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
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
    <div className="flex flex-col gap-6">
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
    </div>
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
