'use client';

import type { LessonDetail, SubmissionResult } from '@loophole/shared';
import { ArrowLeft, Lock, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Checklist } from '@/components/checklist';
import { CodeEditor } from '@/components/code-editor';
import { GoalRing, lessonsLeft } from '@/components/daily-goal';
import {
  GUIDES,
  Guide,
  GuideSays,
  guideFor,
  type GuideId,
} from '@/components/guide';
import { InlineCode } from '@/components/inline-code';
import { LearnCards } from '@/components/learn-cards';
import { LessonTopBar } from '@/components/lesson-top-bar';
import { QuickCheck } from '@/components/quick-check';
import { SampleTests } from '@/components/sample-tests';
import { Terminal } from '@/components/terminal';
import { TestResults } from '@/components/test-results';
import { TutorPanel } from '@/components/tutor-panel';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { stickerCard, stickerOutline } from '@/components/ui/card';
import { WebPreview } from '@/components/web-preview';
import { ApiError } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { languageInfo } from '@/lib/languages';
import { useLesson } from '@/lib/queries/use-lessons';
import { useMe } from '@/lib/queries/use-me';
import { useSubmissions, useSubmit } from '@/lib/queries/use-submissions';
import { useCountUp } from '@/lib/use-count-up';
import { useRequireSession } from '@/lib/use-require-session';
import { useLessonWords } from '@/lib/lesson-words';

// One lesson, full screen (ADR-029): no app menu, just a way out and a
// progress bar. Learn cards and a quick check, then the exercise (prompt,
// sample tests, editor, Run, and the graded result), then a finish screen.
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireSession();
  const lesson = useLesson(id, !loading);
  // The editor starts from the user's latest attempt, if any.
  const history = useSubmissions(lesson.data?.exercise.id, !loading);

  // A lesson that can't open keeps the app's menu: the usual way on.
  if (lesson.isError) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <LessonError error={lesson.error} />
        </main>
      </>
    );
  }

  if (loading || lesson.isPending || history.isPending) {
    return (
      <>
        <LessonTopBar
          backHref={
            lesson.data ? `/learn/${lesson.data.course.slug}` : '/learn'
          }
          language={lesson.data?.course.language}
          value={0}
          max={1}
        />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-text-secondary">
            {lesson.data ? 'Loading your code…' : 'Loading the lesson…'}
          </p>
        </main>
      </>
    );
  }

  return (
    <Lesson
      key={lesson.data.id}
      lesson={lesson.data}
      // A failed history load just means starting from the starter code.
      initialCode={history.data?.[0]?.code ?? lesson.data.exercise.starterCode}
      // Someone who already tried the exercise skips straight to it.
      startAt={history.data?.length ? 'practice' : 'learn'}
    />
  );
}

type Step = 'learn' | 'check' | 'practice' | 'done';

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
  const guide = guideFor(lesson.course.language);
  const [step, setStep] = useState<Step>(learn ? startAt : 'practice');
  const [card, setCard] = useState(0);
  const [finished, setFinished] = useState<SubmissionResult | null>(null);

  function go(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  // The bar fills one notch per card, one for the check, one for practice.
  const cards = learn?.cards.length ?? 0;
  const total = cards + (learn ? 1 : 0) + 1;
  const position = {
    learn: card,
    check: cards,
    practice: total - 1,
    done: total,
  }[step];
  const reading = step === 'learn' || step === 'check';
  // Web lessons are wider: editor and live preview sit side by side.
  const wide = lesson.exercise.kind === 'web' && step === 'practice';

  return (
    <>
      <LessonTopBar
        backHref={`/learn/${lesson.course.slug}`}
        language={lesson.course.language}
        value={position}
        max={total}
        onSkip={reading ? () => go('practice') : undefined}
      />
      {/* While a bottom bar shows, the page leaves room under it. */}
      <main
        className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 ${wide ? 'max-w-5xl' : 'max-w-3xl'} ${reading ? 'pb-44' : ''}`}
      >
        <article className="flex flex-col gap-6">
          {step !== 'done' && (
            <h1 className="font-display text-2xl font-extrabold text-balance sm:text-3xl">
              {lesson.title}
            </h1>
          )}

          {learn && (
            <>
              <div hidden={step !== 'learn'}>
                <LearnCards
                  guide={guide}
                  lessonId={lesson.id}
                  kind={lesson.exercise.kind}
                  language={lesson.course.language}
                  cards={learn.cards}
                  index={card}
                  onIndex={(i) => {
                    setCard(i);
                    window.scrollTo({ top: 0 });
                  }}
                  onDone={() => go('check')}
                />
              </div>
              <div hidden={step !== 'check'}>
                <QuickCheck
                  guide={guide}
                  check={learn.check}
                  onDone={() => go('practice')}
                />
              </div>
            </>
          )}

          <div hidden={step !== 'practice'}>
            <Exercise
              guide={guide}
              lesson={lesson}
              initialCode={initialCode}
              onReviewCards={
                learn
                  ? () => {
                      setCard(0);
                      go('learn');
                    }
                  : undefined
              }
              onComplete={(result) => {
                setFinished(result);
                go('done');
              }}
            />
          </div>

          {step === 'done' && finished && (
            <LessonComplete
              guide={guide}
              lesson={lesson}
              result={finished}
              onReview={() => go('practice')}
            />
          )}
        </article>
      </main>
    </>
  );
}

function Exercise({
  guide,
  lesson,
  initialCode,
  onReviewCards,
  onComplete,
}: {
  guide: GuideId;
  lesson: LessonDetail;
  initialCode: string;
  onReviewCards?: () => void;
  onComplete: (result: SubmissionResult) => void;
}) {
  const {
    id: exerciseId,
    kind,
    prompt,
    starterCode,
    sampleTests,
    checks,
  } = lesson.exercise;
  // Web exercises (ADR-024): a page checked by rules, with a live preview.
  const web = kind === 'web';
  // Git exercises (ADR-026): `code` is the terminal's commands, one per
  // line, so submitting and the latest attempt work as for any exercise.
  const git = kind === 'git';
  const [code, setCode] = useState(initialCode);
  // Memoised: the terminal replays whenever this array changes identity.
  const commands = useMemo(
    () =>
      code
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    [code],
  );
  const submit = useSubmit();
  const result = submit.data;
  const completed = result?.lessonCompleted ?? false;

  function run() {
    submit.mutate(
      { exerciseId, code },
      // A pass opens the finish screen (ADR-029).
      { onSuccess: (r) => r.lessonCompleted && onComplete(r) },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The guide reads out the task (DESIGN_SYSTEM §9). */}
      <GuideSays
        guide={guide}
        mood={completed ? 'happy' : 'idle'}
        speak={prompt}
      >
        <p className="text-xs font-bold tracking-wide text-text-secondary uppercase">
          {lesson.project ? 'Your project · +30 XP' : 'Your task'}
        </p>
        {/* A project's brief is a few lines: one paragraph each (ADR-043). */}
        {prompt.split('\n').map((line, i) => (
          <p key={i} className={`text-lg ${i > 0 ? 'mt-2' : ''}`}>
            <InlineCode text={line} />
          </p>
        ))}
      </GuideSays>
      {onReviewCards && (
        <button
          type="button"
          onClick={onReviewCards}
          className="-mt-3 inline-flex items-center gap-1 self-start rounded-badge text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={3} aria-hidden /> Review
          the cards
        </button>
      )}

      {git ? (
        <Terminal
          lessonId={lesson.id}
          commands={commands}
          onCommandsChange={(next) => setCode(next.join('\n'))}
        />
      ) : web ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeEditor
            value={code}
            onChange={setCode}
            fileName="index.html"
            language="html"
          />
          <WebPreview html={code} className="h-72 lg:h-full lg:min-h-72" />
        </div>
      ) : (
        <>
          <SampleTests tests={sampleTests} />
          <CodeEditor
            value={code}
            onChange={setCode}
            fileName={languageInfo(lesson.course.language).file}
            language={languageInfo(lesson.course.language).editor}
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* One orange button per region: Continue takes over once passed. */}
        <button
          type="button"
          onClick={run}
          disabled={submit.isPending}
          className={completed ? secondaryButton : primaryButton}
        >
          {submit.isPending
            ? web || git
              ? 'Checking…'
              : 'Running…'
            : git
              ? 'Check my work'
              : web
                ? 'Check my page'
                : 'Run'}
        </button>
        <button
          type="button"
          onClick={() => setCode(starterCode)}
          disabled={submit.isPending || code === starterCode}
          className={secondaryButton}
        >
          <RotateCcw className="size-4" strokeWidth={3} />{' '}
          {git ? 'Start over' : 'Reset code'}
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

      {/* Back from the finish screen: a short reminder and the way on. */}
      {completed && (
        <div
          role="status"
          className={`${stickerOutline} flex flex-wrap items-center justify-between gap-4 bg-lemon px-5 py-3`}
        >
          <p className="font-display text-xl font-extrabold">
            {lesson.project ? 'Project complete!' : 'Lesson complete!'}
          </p>
          <Link
            href={
              result?.certificateSlug
                ? `/c/${result.certificateSlug}`
                : `/learn/${lesson.course.slug}`
            }
            className={primaryButton}
          >
            {result?.certificateSlug ? 'View certificate' : 'Continue'}
          </Link>
        </div>
      )}

      {/* Web and git: the checklist is always shown, ticked after each
          check. */}
      {web || git ? (
        <Checklist checks={checks} result={result} />
      ) : (
        result && <TestResults result={result} />
      )}

      {/* After the results, so Explain sits under the error it explains. */}
      {!completed && (
        <TutorPanel
          guide={guide}
          exerciseId={exerciseId}
          code={code}
          submission={result}
        />
      )}
    </div>
  );
}

// The finish screen (ADR-029): the guide cheers, XP counts up, the streak
// shows, and Continue leads back to the path. Confetti only for a first
// completion, the one that paid XP.
function LessonComplete({
  guide,
  lesson,
  result,
  onReview,
}: {
  guide: GuideId;
  lesson: LessonDetail;
  result: SubmissionResult;
  onReview: () => void;
}) {
  const me = useMe(true);
  const words = useLessonWords();
  const xp = useCountUp(result.xpAwarded, { from: 0 });
  const { name, cheer, tint } = GUIDES[guide];
  const streak = me.data?.streak.current;

  useEffect(() => {
    if (result.xpAwarded > 0) celebrate();
  }, [result]);

  return (
    <section
      role="status"
      className={`${stickerCard} flex flex-col items-center gap-5 overflow-hidden px-6 pb-8 text-center`}
    >
      <div
        className="-mx-6 flex w-[calc(100%+3rem)] justify-center border-b-2 border-ink pt-6"
        style={{ backgroundColor: tint }}
      >
        <Guide
          guide={guide}
          mood="happy"
          label={`${name} cheering`}
          className="h-48 w-[137px]"
        />
      </div>
      <h1 className="font-display text-4xl font-extrabold">
        {lesson.project ? 'Project complete!' : 'Lesson complete!'}
      </h1>
      <p className="text-lg">
        <span className="font-bold">{name}:</span> “{cheer} {words.finished[0]}
        <span className="font-bold">{lesson.title}</span>
        {words.finished[1]}”
      </p>

      <dl className="grid w-full max-w-sm grid-cols-2 gap-3">
        <Stat
          label="XP earned"
          head="bg-lemon text-ink"
          value={`+${xp}`}
          note={result.xpAwarded > 0 ? undefined : 'Paid the first time'}
        />
        <Stat
          label="Streak"
          head="bg-blue text-paper"
          value={
            streak === undefined
              ? '…'
              : `${streak} ${streak === 1 ? 'day' : 'days'}`
          }
        />
      </dl>

      {/* Today against the daily goal (ADR-033). */}
      {me.data && me.data.dailyGoal !== null && (
        <p className="flex items-center gap-2 font-bold">
          <GoalRing
            value={me.data.todayXp}
            goal={me.data.dailyGoal}
            className="size-6 shrink-0"
          />
          {me.data.todayXp >= me.data.dailyGoal
            ? `Daily goal done: ${me.data.todayXp} XP today!`
            : `Daily goal: ${me.data.todayXp} of ${me.data.dailyGoal} XP. ${lessonsLeft(me.data.todayXp, me.data.dailyGoal)} more ${lessonsLeft(me.data.todayXp, me.data.dailyGoal) === 1 ? 'lesson' : 'lessons'} to go.`}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        {result.certificateSlug && (
          <Link
            href={`/c/${result.certificateSlug}`}
            className={`${primaryButton} uppercase`}
          >
            See your certificate
          </Link>
        )}
        <Link
          href={`/learn/${lesson.course.slug}`}
          className={`${result.certificateSlug ? secondaryButton : primaryButton} uppercase`}
        >
          Continue
        </Link>
        <button
          type="button"
          onClick={onReview}
          className="self-center rounded-badge px-2 text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to my code
        </button>
      </div>
    </section>
  );
}

function Stat({
  label,
  head,
  value,
  note,
}: {
  label: string;
  head: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border-2 border-ink">
      <dt
        className={`px-2 py-1 text-xs font-bold tracking-wide uppercase ${head}`}
      >
        {label}
      </dt>
      <dd className="px-2 py-2 font-display text-2xl font-extrabold tabular-nums">
        {value}
        {note && (
          <span className="block font-sans text-xs font-bold text-text-secondary">
            {note}
          </span>
        )}
      </dd>
    </div>
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
        <Guide guide="priya" mood="oops" className="h-28 w-20" />
      )}
      <p className="font-display text-2xl font-extrabold">
        {locked ? 'Finish the previous lesson first' : 'Lesson not available'}
      </p>
      {!locked && <p className="text-text-secondary">{error.message}</p>}
      <Link href="/learn" className={locked ? primaryButton : secondaryButton}>
        Back to your courses
      </Link>
    </div>
  );
}
