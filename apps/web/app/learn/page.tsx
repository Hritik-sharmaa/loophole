'use client';

import { AppHeader } from '@/components/app-header';
import { LessonPath } from '@/components/lesson-path';
import { useCoursePath, useCourses } from '@/lib/queries/use-lessons';
import { useRequireSession } from '@/lib/use-require-session';

// The signed-in home: the lesson path for the first course (v1 has one).
export default function LearnPage() {
  const { session, loading } = useRequireSession();
  const courses = useCourses(!loading);
  const slug = courses.data?.[0]?.slug;
  const path = useCoursePath(slug, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {loading || courses.isPending || (slug && path.isPending) ? (
          <p className="text-center text-text-secondary">Loading your path…</p>
        ) : courses.isError || path.isError ? (
          <p role="alert" className="text-center">
            ✕ Could not load the path: {(courses.error ?? path.error)?.message}
          </p>
        ) : !path.data ? (
          <p className="text-center text-text-secondary">No courses yet.</p>
        ) : (
          <LessonPath path={path.data} userId={session?.user.id ?? null} />
        )}
      </main>
    </>
  );
}
