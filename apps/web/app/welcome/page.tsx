'use client';

import type {
  CourseOverview,
  DailyGoal,
  LessonLanguage,
} from '@loophole/shared';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GoalPicker } from '@/components/daily-goal';
import {
  CrewLineup,
  GUIDES,
  Guide,
  GuideSays,
  guideFor,
} from '@/components/guide';
import { LanguageTile } from '@/components/language-logo';
import {
  HINGLISH_COURSES,
  LessonLanguagePicker,
} from '@/components/lesson-language-picker';
import { Logo } from '@/components/logo';
import { ProgressBar } from '@/components/progress-bar';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { stickerCard } from '@/components/ui/card';
import { useCoursePath, useCourses } from '@/lib/queries/use-lessons';
import { useMe, useUpdateMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

type Step = 'course' | 'goal' | 'language' | 'hello';
const STEPS: Step[] = ['course', 'goal', 'language', 'hello'];

// The first-run welcome (ADR-033): pick a first course, pick a daily goal,
// pick English or Hinglish lessons (ADR-042), then that course's guide says
// hello and leads into lesson 1. /learn sends anyone without a daily goal
// here.
export default function WelcomePage() {
  const { loading } = useRequireSession();
  const me = useMe(!loading);
  const courses = useCourses(!loading);
  const update = useUpdateMe();
  const [step, setStep] = useState<Step>('course');
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [goal, setGoal] = useState<DailyGoal>(20);
  const [language, setLanguage] = useState<LessonLanguage>('en');
  // The first lesson to open at the end: the chosen course's active one.
  const path = useCoursePath(course?.slug, step === 'hello');

  const guide = guideFor(course?.language);
  const name = GUIDES[guide].name;

  function saveGoal() {
    update.mutate(
      { dailyGoal: goal },
      { onSuccess: () => setStep('language') },
    );
  }
  function saveLanguage() {
    update.mutate(
      { lessonLanguage: language },
      { onSuccess: () => setStep('hello') },
    );
  }

  const next = path.data?.units
    .flatMap((u) => u.lessons)
    .find((l) => l.state === 'active');
  // A lesson pays 10 XP (ADR-012).
  const perDay = goal / 10;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border-muted bg-paper pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo href="/" size="sm" />
          <div className="flex-1">
            <ProgressBar
              value={STEPS.indexOf(step) + 1}
              max={STEPS.length}
              label="Welcome progress"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {loading || courses.isPending ? (
          <p className="text-text-secondary">Getting things ready…</p>
        ) : courses.isError ? (
          <p role="alert">
            ✕ Could not load the courses: {courses.error.message}
          </p>
        ) : step === 'course' ? (
          <>
            <CrewLineup mood="happy" className="self-center" />
            <GuideSays guide="priya" mood="happy">
              <h1 className="font-display text-2xl font-semibold text-balance">
                Namaste{me.data ? `, ${me.data.username}` : ''}! We are the
                Loophole crew.
              </h1>
              <p className="text-lg">
                Each of us teaches one course. What do you want to learn first?
              </p>
            </GuideSays>
            <ul className="grid gap-4 sm:grid-cols-2">
              {courses.data.map((c) => {
                const g = guideFor(c.language);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCourse(c);
                        setStep('goal');
                      }}
                      className={`${stickerCard} flex h-full w-full items-center gap-4 p-4 text-left transition-[translate,box-shadow] duration-[50ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet active:translate-y-1 active:shadow-none`}
                    >
                      <Guide
                        guide={g}
                        crop="bust"
                        className="size-16 shrink-0 rounded-node border border-border-muted"
                        style={{ backgroundColor: GUIDES[g].tint }}
                      />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="flex items-center gap-2 font-display text-xl font-semibold">
                          <LanguageTile language={c.language} size="sm" />
                          {c.title}
                        </span>
                        <span className="text-sm font-bold text-text-secondary">
                          with {GUIDES[g].name}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : step === 'goal' ? (
          <>
            <button
              type="button"
              onClick={() => setStep('course')}
              className="inline-flex items-center gap-1 self-start rounded-badge text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            >
              <ArrowLeft className="size-4" strokeWidth={3} aria-hidden /> Pick
              another course
            </button>
            <GuideSays guide={guide} mood="thinking">
              <h1 className="font-display text-2xl font-semibold text-balance">
                Great choice! How much time can you give each day?
              </h1>
              <p className="text-lg">
                A little every day beats a lot once a week. You can change this
                later on your profile.
              </p>
            </GuideSays>
            <GoalPicker
              value={goal}
              onPick={setGoal}
              disabled={update.isPending}
            />
            {update.isError && (
              <p role="alert" className="font-bold">
                ✕ {update.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={saveGoal}
              disabled={update.isPending}
              className={`${primaryButton} uppercase sm:self-end sm:min-w-52`}
            >
              {update.isPending ? 'Saving…' : 'Continue'}
            </button>
          </>
        ) : step === 'language' ? (
          <>
            <button
              type="button"
              onClick={() => setStep('goal')}
              className="inline-flex items-center gap-1 self-start rounded-badge text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            >
              <ArrowLeft className="size-4" strokeWidth={3} aria-hidden />{' '}
              Change my goal
            </button>
            <GuideSays guide={guide} mood="thinking">
              <h1 className="font-display text-2xl font-semibold text-balance">
                How should I explain things?
              </h1>
              <p className="text-lg">
                English, or Hinglish, the way we talk? Code stays the same
                either way, and you can switch on your profile.
              </p>
            </GuideSays>
            <LessonLanguagePicker
              value={language}
              onPick={setLanguage}
              disabled={update.isPending}
            />
            {course &&
              !HINGLISH_COURSES.includes(course.language) &&
              language === 'hinglish' && (
                <p className="text-sm font-bold text-text-secondary">
                  {course.title} is still in English for now; its Hinglish is on
                  the way.
                </p>
              )}
            {update.isError && (
              <p role="alert" className="font-bold">
                ✕ {update.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={saveLanguage}
              disabled={update.isPending}
              className={`${primaryButton} uppercase sm:self-end sm:min-w-52`}
            >
              {update.isPending ? 'Saving…' : 'Continue'}
            </button>
          </>
        ) : (
          <section
            className={`${stickerCard} flex flex-col items-center gap-5 overflow-hidden px-6 pb-8 text-center`}
          >
            <div
              className="-mx-6 flex w-[calc(100%+3rem)] justify-center border-b border-border-muted pt-6"
              style={{ backgroundColor: GUIDES[guide].tint }}
            >
              <Guide
                guide={guide}
                mood="happy"
                label={`${name} waving hello`}
                className="h-48 w-[137px]"
              />
            </div>
            <h1 className="font-display text-3xl font-semibold text-balance">
              Namaste{me.data ? `, ${me.data.username}` : ''}! I&apos;m {name}.
            </h1>
            <p className="max-w-md text-lg">
              I&apos;ll teach you{' '}
              <span className="font-bold">{course?.title}</span>,{' '}
              {perDay === 1 ? 'one lesson' : `${perDay} lessons`} a day. Every
              lesson starts with a few cards, so you never start from nothing.
              Ready?
            </p>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Link
                href={
                  next ? `/lessons/${next.id}` : `/learn/${course?.slug ?? ''}`
                }
                className={`${primaryButton} uppercase`}
              >
                Start my first lesson
              </Link>
              <Link href="/learn" className={secondaryButton}>
                See all courses
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
