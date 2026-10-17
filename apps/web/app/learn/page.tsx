'use client';

import type { CoursePath } from '@loophole/shared';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { LessonNode } from '@/components/lesson-node';
import { useCoursePath, useCourses } from '@/lib/queries/use-lessons';
import { useRequireSession } from '@/lib/use-require-session';

// Sideways offsets (px) that make the nodes zig-zag down the page.
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56];

// The signed-in home: the lesson path for the first course (v1 has one).
export default function LearnPage() {
  const { loading } = useRequireSession();
  const courses = useCourses(!loading);
  const slug = courses.data?.[0]?.slug;
  const path = useCoursePath(slug, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {loading || courses.isPending || (slug && path.isPending) ? (
          <p className="text-center text-text-secondary">Loading your path…</p>
        ) : courses.isError || path.isError ? (
          <p role="alert" className="text-center">
            ✕ Could not load the path: {(courses.error ?? path.error)?.message}
          </p>
        ) : !path.data ? (
          <p className="text-center text-text-secondary">No courses yet.</p>
        ) : (
          <LessonPath path={path.data} />
        )}
      </main>
    </>
  );
}

function LessonPath({ path }: { path: CoursePath }) {
  // Position of each unit's first lesson in the whole course, so the
  // zig-zag continues across units.
  const firstIndex = path.units.map((_, u) =>
    path.units.slice(0, u).reduce((n, unit) => n + unit.lessons.length, 0),
  );

  return (
    <div className="flex flex-col gap-12">
      <h1 className="font-display text-4xl font-extrabold">
        {path.course.title}
      </h1>

      {path.units.map((unit, unitNumber) => (
        <section key={unit.id} className="flex flex-col items-center gap-8">
          <div className="w-full rounded-card bg-ink px-5 py-4 text-paper">
            <p className="text-xs font-bold tracking-wide text-surface uppercase">
              Unit {unitNumber + 1}
            </p>
            <h2 className="font-display text-2xl font-extrabold">
              {unit.title}
            </h2>
          </div>

          <ol className="flex flex-col items-center gap-6">
            {unit.lessons.map((lesson, i) => {
              const offset =
                ZIGZAG[(firstIndex[unitNumber] + i) % ZIGZAG.length];
              const node = (
                <>
                  <LessonNode state={lesson.state} />
                  <span
                    className={`text-sm font-bold ${lesson.state === 'locked' ? 'text-text-tertiary' : 'text-ink'}`}
                  >
                    {lesson.title}
                  </span>
                </>
              );
              return (
                <li
                  key={lesson.id}
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  {lesson.state === 'locked' ? (
                    <div
                      aria-disabled="true"
                      title="Finish the previous lesson first"
                      className="flex flex-col items-center gap-2"
                    >
                      {node}
                    </div>
                  ) : (
                    <Link
                      href={`/lessons/${lesson.id}`}
                      className="flex flex-col items-center gap-2 rounded-card p-1 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-y-1"
                    >
                      {node}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
