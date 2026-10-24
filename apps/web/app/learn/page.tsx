'use client';

import type { CourseOverview } from '@loophole/shared';
import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CareerPaths } from '@/components/career-paths';
import { AppHeader } from '@/components/app-header';
import { CourseBanner } from '@/components/course-banner';
import { DailyBugCard } from '@/components/daily-bug-card';
import { GUIDES, Guide, GuideSays, guideFor } from '@/components/guide';
import { LanguageTile } from '@/components/language-logo';
import { ProgressBar } from '@/components/progress-bar';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { chip, stickerOutline } from '@/components/ui/card';
import { useCourses } from '@/lib/queries/use-lessons';
import { useMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

// Tracks announced but not seeded yet (ADR-023), shown so learners can see
// what is coming. Every agreed track is live now; add an entry here when a
// new one is planned, and delete it once its course is seeded.
const COMING_SOON: { title: string; language: string; description: string }[] =
  [];

// The signed-in home (ADR-023): continue the current course, or pick one.
export default function LearnPage() {
  const { loading } = useRequireSession();
  const courses = useCourses(!loading);
  const me = useMe(!loading);
  const router = useRouter();

  // No daily goal yet: a first visit. The welcome picks a course and a
  // goal first (ADR-033).
  useEffect(() => {
    if (me.data && me.data.dailyGoal === null) router.replace('/welcome');
  }, [me.data, router]);

  const list = courses.data ?? [];
  // orderCourses() on the server puts the most recent course first.
  const current = list.find(
    (c) => c.completedCount > 0 && c.completedCount < c.lessonCount,
  );

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <GuideSays guide={guideFor(current?.language)} mood="happy">
          <p className="font-display text-xl font-semibold sm:text-2xl">
            {me.data ? `Hi, ${me.data.username}!` : 'Hi!'}{' '}
            {current ? 'Ready to keep going?' : 'What do you want to learn?'}
          </p>
        </GuideSays>

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
            {/* Bug of the day (ADR-035): reads only the board. */}
            <DailyBugCard enabled={!loading} />

            <section className="flex flex-col gap-4">
              <h2 className="font-display text-2xl font-semibold">
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

            {/* Job-focused paths through the courses (ADR-045). */}
            <CareerPaths courses={list} />
          </>
        )}
      </main>
    </>
  );
}

// The one yellow button on the page, on the one violet card: back into
// the current course.
function ContinueCard({ course }: { course: CourseOverview }) {
  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-card bg-violet p-5 text-paper shadow-[0_24px_40px_-24px_rgb(74_48_200/0.8)] sm:flex-row sm:items-center sm:p-6">
      <LanguageTile language={course.language} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-bold tracking-wide text-violet-tint uppercase">
          Continue where you left off
        </p>
        <h2 className="font-display text-2xl font-semibold">{course.title}</h2>
        <ProgressBar
          value={course.completedCount}
          max={course.lessonCount}
          label={`${course.title} progress`}
        />
        <p className="text-sm font-bold text-violet-tint">
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
  const guide = guideFor(course.language);

  return (
    <article
      className={`${stickerOutline} flex h-full flex-col overflow-hidden bg-paper`}
      aria-label={course.title}
    >
      {/* Each course's own banner, like a land on a map (ADR-027). */}
      <CourseBanner
        language={course.language}
        className="h-28 border-b border-border-muted"
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <LanguageTile language={course.language} />
          <h3 className="font-display text-xl font-semibold">{course.title}</h3>
        </div>
        {course.description && (
          <p className="text-text-secondary">{course.description}</p>
        )}
        <p className="flex items-center gap-2 text-sm font-bold">
          <Guide
            guide={guide}
            crop="bust"
            className="size-9 rounded-node border border-border-muted"
            // The tint behind the face, like their course banner.
            style={{ backgroundColor: GUIDES[guide].tint }}
          />
          Taught by {GUIDES[guide].name}
        </p>
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
      </div>
    </article>
  );
}

// Not a sticker yet: dashed outline, like a locked lesson node.
function ComingSoonCard({
  title,
  language,
  description,
}: {
  title: string;
  language: string;
  description: string;
}) {
  return (
    <article
      className="flex h-full flex-col gap-4 rounded-card border-2 border-dashed border-border-muted bg-paper/60 p-5"
      aria-label={`${title}, coming soon`}
    >
      <div className="flex items-center gap-3">
        <span className="opacity-50">
          <LanguageTile language={language} />
        </span>
        <h3 className="font-display text-xl font-semibold text-text-secondary">
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
