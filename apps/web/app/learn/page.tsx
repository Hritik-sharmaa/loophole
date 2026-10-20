'use client';

import type { CourseOverview } from '@loophole/shared';
import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { ByteSays } from '@/components/byte';
import { ProgressBar } from '@/components/progress-bar';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard, stickerOutline } from '@/components/ui/card';
import { useCourses } from '@/lib/queries/use-lessons';
import { useMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

// Tracks announced but not seeded yet (ADR-023), shown so learners can see
// what is coming. Every agreed track is live now; add an entry here when a
// new one is planned, and delete it once its course is seeded.
const COMING_SOON: { title: string; mark: string; description: string }[] = [];

// The short mark on each course's tile, by course language.
const MARKS: Record<string, string> = {
  python: 'py',
  html: '</>',
  javascript: 'js',
  git: 'git',
};

// The signed-in home (ADR-023): continue the current course, or pick one.
export default function LearnPage() {
  const { loading } = useRequireSession();
  const courses = useCourses(!loading);
  const me = useMe(!loading);

  const list = courses.data ?? [];
  // orderCourses() on the server puts the most recent course first.
  const current = list.find(
    (c) => c.completedCount > 0 && c.completedCount < c.lessonCount,
  );

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <ByteSays mood="happy">
          <p className="font-display text-xl font-extrabold sm:text-2xl">
            {me.data ? `Hi, ${me.data.username}!` : 'Hi!'}{' '}
            {current ? 'Ready to keep going?' : 'What do you want to learn?'}
          </p>
        </ByteSays>

        {loading || courses.isPending ? (
          <p className="text-center text-text-secondary">
            Loading your courses…
          </p>
        ) : courses.isError ? (
          <p role="alert" className="text-center">
            ✕ Could not load the courses: {courses.error.message}
          </p>
        ) : (
          <>
            {current && <ContinueCard course={current} />}

            <section className="flex flex-col gap-4">
              <h2 className="font-display text-2xl font-extrabold">
                {current ? 'All courses' : 'Courses'}
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2">
                {list.map((course) => (
                  <li key={course.id}>
                    <CourseCard course={course} />
                  </li>
                ))}
                {COMING_SOON.map((soon) => (
                  <li key={soon.title}>
                    <ComingSoonCard {...soon} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

// The one orange button on the page: back into the current course.
function ContinueCard({ course }: { course: CourseOverview }) {
  return (
    <section
      className={`${stickerOutline} flex flex-col gap-4 bg-lemon p-5 sm:flex-row sm:items-center sm:p-6`}
    >
      <CourseMark mark={MARKS[course.language] ?? course.language} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-bold tracking-wide uppercase">
          Continue where you left off
        </p>
        <h2 className="font-display text-2xl font-extrabold">{course.title}</h2>
        <ProgressBar
          value={course.completedCount}
          max={course.lessonCount}
          label={`${course.title} progress`}
        />
        <p className="text-sm font-bold">
          {course.completedCount} of {course.lessonCount} lessons done
        </p>
      </div>
      <Link
        href={`/learn/${course.slug}`}
        className={`${primaryButton} self-start sm:self-center`}
      >
        Continue <ArrowRight className="size-4" strokeWidth={3} />
      </Link>
    </section>
  );
}

function CourseCard({ course }: { course: CourseOverview }) {
  const done = course.completedCount;
  const finished = course.lessonCount > 0 && done >= course.lessonCount;
  const action = finished ? 'Review' : done > 0 ? 'Continue' : 'Start';

  return (
    <article
      className={`${stickerCard} flex h-full flex-col gap-4 p-5`}
      aria-label={course.title}
    >
      <div className="flex items-center gap-3">
        <CourseMark mark={MARKS[course.language] ?? course.language} small />
        <h3 className="font-display text-xl font-extrabold">{course.title}</h3>
      </div>
      {course.description && (
        <p className="text-text-secondary">{course.description}</p>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <ProgressBar
          value={done}
          max={course.lessonCount}
          label={`${course.title} progress`}
        />
        <p className="text-sm font-bold text-text-secondary">
          {finished
            ? `All ${course.lessonCount} lessons done`
            : `${done} of ${course.lessonCount} lessons done`}
        </p>
      </div>
      <Link
        href={`/learn/${course.slug}`}
        className={`${secondaryButton} self-start`}
      >
        {action} <ArrowRight className="size-4" strokeWidth={3} />
      </Link>
    </article>
  );
}

// Not a sticker yet: dashed outline, like a locked lesson node.
function ComingSoonCard({
  title,
  mark,
  description,
}: {
  title: string;
  mark: string;
  description: string;
}) {
  return (
    <article
      className="flex h-full flex-col gap-4 rounded-card border-2 border-dashed border-border-muted bg-paper/60 p-5"
      aria-label={`${title}, coming soon`}
    >
      <div className="flex items-center gap-3">
        <CourseMark mark={mark} small muted />
        <h3 className="font-display text-xl font-extrabold text-text-secondary">
          {title}
        </h3>
      </div>
      <p className="text-text-secondary">{description}</p>
      <span className={`${chip} mt-auto self-start bg-surface text-ink`}>
        <Lock className="size-3" strokeWidth={3} aria-hidden /> Coming soon
      </span>
    </article>
  );
}

// A course's tile: its short mark in Byte's screen colours.
function CourseMark({
  mark,
  small = false,
  muted = false,
}: {
  mark: string;
  small?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-card border-2 font-mono font-bold ${small ? 'size-11 text-sm' : 'size-16 text-xl'} ${muted ? 'border-border-muted bg-surface text-text-secondary' : 'border-ink bg-ink text-orange'}`}
    >
      {mark}
    </span>
  );
}
