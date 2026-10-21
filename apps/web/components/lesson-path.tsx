'use client';

import type { CoursePath, LessonState } from '@loophole/shared';
import { Award, Bug, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheatSheet } from '@/components/cheat-sheet';
import { CourseBanner } from '@/components/course-banner';
import { GUIDES, Guide, guideFor } from '@/components/guide';
import { LessonNode } from '@/components/lesson-node';
import { ProgressBar } from '@/components/progress-bar';
import { UnitBadge } from '@/components/unit-badge';
import { secondaryButton } from '@/components/ui/buttons';
import { chip, stickerCard } from '@/components/ui/card';
import {
  PATH_WIDTH,
  donePointCount,
  improvedLessons,
  layoutNodes,
  pathHeight,
  pathThrough,
} from '@/lib/path-geometry';

type States = Record<string, LessonState>;

const STATE_LABEL: Record<LessonState, string> = {
  completed: 'completed',
  active: 'start here',
  locked: 'locked',
};

// The hand-built lesson path (DESIGN_SYSTEM §6 LessonPath): nodes zig-zag
// down the page on a dotted track; the part already walked is solid Blue.
// Lessons whose state moved forward since the last visit play the unlock
// pop once; a normal page load stays still (DESIGN_SYSTEM §1).
export function LessonPath({
  path,
  userId,
}: {
  path: CoursePath;
  userId: string | null;
}) {
  const current = useMemo<States>(
    () =>
      Object.fromEntries(
        path.units.flatMap((u) => u.lessons.map((l) => [l.id, l.state])),
      ),
    [path],
  );
  // Decided once, on first render, against what this browser last saw.
  const [popping] = useState(() => improvedLessons(readSeen(userId), current));
  useEffect(() => writeSeen(userId, current), [userId, current]);

  // Each unit's first lesson's place in the whole course, so the zig-zag
  // carries on across units.
  const firstIndex = path.units.map((_, u) =>
    path.units.slice(0, u).reduce((n, unit) => n + unit.lessons.length, 0),
  );
  const lessons = path.units.flatMap((u) => u.lessons);
  const completed = lessons.filter((l) => l.state === 'completed').length;
  const guide = guideFor(path.course.language);
  // A unit's badge is earned when every lesson in it is done (ADR-030).
  const earned = path.units.map((unit) =>
    unit.lessons.every((l) => l.state === 'completed'),
  );

  return (
    <div className="flex flex-col gap-12">
      <header className={`${stickerCard} overflow-hidden`}>
        <CourseBanner
          language={path.course.language}
          className="h-32 border-b-2 border-ink sm:h-40"
        />
        <div className="flex items-center gap-5 px-5 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
              {path.course.title}
            </h1>
            <ProgressBar
              value={completed}
              max={lessons.length}
              label="Course progress"
            />
            <p className="text-sm font-bold text-text-secondary">
              {completed} of {lessons.length} lessons done
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-bold">
                Badges {earned.filter(Boolean).length}/{earned.length}
              </span>
              <ul className="flex flex-wrap gap-1">
                {earned.map((got, u) => (
                  <li key={path.units[u].id}>
                    <UnitBadge number={u + 1} earned={got} className="size-7" />
                  </li>
                ))}
              </ul>
            </div>
            {/* The practice stop (ADR-037): once there is something to
                review. */}
            {completed > 0 && (
              <Link
                href={`/learn/${path.course.slug}/practice`}
                className={`${secondaryButton} self-start px-4 py-2 text-sm`}
              >
                <Dumbbell className="size-4" strokeWidth={2.5} aria-hidden />
                Practice what you&apos;ve learned
              </Link>
            )}
          </div>
          {/* The course's guide (ADR-028), cheering once it's all done. */}
          <Guide
            guide={guide}
            mood={completed === lessons.length ? 'happy' : 'idle'}
            label={`${GUIDES[guide].name}, your ${path.course.title} guide`}
            className="h-24 w-[68px] shrink-0 sm:h-28 sm:w-20"
          />
        </div>
      </header>

      {path.units.map((unit, u) => {
        const points = layoutNodes(unit.lessons.length, firstIndex[u]);
        const done = donePointCount(unit.lessons.map((l) => l.state));
        const height = pathHeight(unit.lessons.length);
        const unitDone = unit.lessons.filter(
          (l) => l.state === 'completed',
        ).length;

        return (
          <section key={unit.id} className="flex flex-col items-center gap-8">
            <div
              className={`${stickerCard} flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4`}
            >
              <div className="flex items-center gap-3">
                <UnitBadge number={u + 1} earned={earned[u]} />
                <div className="flex flex-col items-start gap-1">
                  <span className={`${chip} bg-lemon text-ink`}>
                    Unit {u + 1} · {unitDone}/{unit.lessons.length}
                  </span>
                  <h2 className="font-display text-2xl font-extrabold">
                    {unit.title}
                  </h2>
                </div>
              </div>
              <CheatSheet
                slug={path.course.slug}
                unitId={unit.id}
                unitTitle={unit.title}
              />
            </div>

            <div className="relative" style={{ width: PATH_WIDTH, height }}>
              <svg
                aria-hidden="true"
                width={PATH_WIDTH}
                height={height}
                viewBox={`0 0 ${PATH_WIDTH} ${height}`}
                fill="none"
                className="absolute inset-0"
              >
                <path
                  d={pathThrough(points)}
                  className="stroke-border-muted"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray="0 14"
                />
                {done >= 2 && (
                  <path
                    d={pathThrough(points.slice(0, done))}
                    className="stroke-blue"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                )}
              </svg>

              <ol>
                {unit.lessons.map((lesson, i) => {
                  const node = (
                    <>
                      <LessonNode
                        state={lesson.state}
                        pop={popping.has(lesson.id)}
                      />
                      <span
                        className={`rounded-badge bg-canvas px-1 text-center text-sm leading-tight font-bold ${lesson.state === 'locked' ? 'text-text-secondary' : 'text-ink'}`}
                      >
                        {lesson.title}
                        <span className="sr-only">
                          {' '}
                          ({STATE_LABEL[lesson.state]})
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li
                      key={lesson.id}
                      className="absolute w-36"
                      style={{ left: points[i].x - 72, top: points[i].y - 32 }}
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
                          className="group flex flex-col items-center gap-2 rounded-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {node}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {unit.bugs > 0 && (
              <BugHuntStop
                href={`/learn/${path.course.slug}/bug-hunt/${unit.id}`}
                bugs={unit.bugs}
                open={earned[u]}
              />
            )}
          </section>
        );
      })}

      <CertificateStop
        slug={path.certificateSlug}
        lessonCount={lessons.length}
        courseTitle={path.course.title}
      />
    </div>
  );
}

// A unit's last stop (ADR-031): its Bug hunt, a review of the unit's
// spot-the-bug cards. Pink, like a duel: the same skill. It opens once the
// unit's badge is earned; until then it is dashed, like a locked lesson.
function BugHuntStop({
  href,
  bugs,
  open,
}: {
  href: string;
  bugs: number;
  open: boolean;
}) {
  const circle =
    'flex size-14 items-center justify-center rounded-node border-[3px]';
  return (
    <div className="-mt-2 flex flex-col items-center gap-2 text-center">
      {open ? (
        <Link
          href={href}
          className="group flex flex-col items-center gap-1.5 rounded-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span
            className={`${circle} border-ink bg-pink shadow-press transition-[translate,box-shadow] duration-[50ms] group-active:translate-y-1 group-active:shadow-none`}
          >
            <Bug className="size-7" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-extrabold">Bug hunt</span>
          <span className="text-sm font-bold text-text-secondary">
            {bugs} bugs to find
          </span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className={`${circle} border-dashed border-border-muted bg-paper text-text-tertiary`}
          >
            <Bug className="size-7" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-extrabold text-text-secondary">
            Bug hunt
          </span>
          <span className="text-sm font-bold text-text-secondary">
            Finish the unit to unlock
          </span>
        </div>
      )}
    </div>
  );
}

// The path's last stop (ADR-030): the course certificate. Lemon and
// clickable once earned; dashed and locked until every lesson is done.
function CertificateStop({
  slug,
  lessonCount,
  courseTitle,
}: {
  slug: string | null;
  lessonCount: number;
  courseTitle: string;
}) {
  return (
    <section
      aria-label={`${courseTitle} certificate`}
      className="-mt-4 flex flex-col items-center gap-3 pb-6 text-center"
    >
      {/* The track runs on into the last stop. */}
      <span
        aria-hidden
        className={`h-12 w-0 border-l-[6px] border-dotted ${slug ? 'border-blue' : 'border-border-muted'}`}
      />
      {slug ? (
        <Link
          href={`/c/${slug}`}
          className="group flex flex-col items-center gap-2 rounded-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="flex size-20 items-center justify-center rounded-node border-[3px] border-ink bg-lemon shadow-press transition-[translate,box-shadow] duration-[50ms] group-active:translate-y-1 group-active:shadow-none">
            <Award className="size-10" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-extrabold">
            Your certificate
          </span>
          <span className="text-sm font-bold text-text-secondary">
            Share it with anyone
          </span>
        </Link>
      ) : (
        <div aria-disabled="true" className="flex flex-col items-center gap-2">
          <span className="flex size-20 items-center justify-center rounded-node border-[3px] border-dashed border-border-muted bg-paper text-text-tertiary">
            <Award className="size-10" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-extrabold text-text-secondary">
            Certificate
          </span>
          <span className="text-sm font-bold text-text-secondary">
            Finish all {lessonCount} lessons to earn it
          </span>
        </div>
      )}
    </section>
  );
}

// Last-seen lesson states, per user, in this browser only: a convenience
// for the unlock pop. Storage can be unavailable (private mode, blocked
// site data); then nothing pops and nothing breaks.
const seenKey = (userId: string) => `loophole:path-states:${userId}`;

function readSeen(userId: string | null): States | null {
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(seenKey(userId));
    return raw ? (JSON.parse(raw) as States) : null;
  } catch {
    return null;
  }
}

function writeSeen(userId: string | null, states: States): void {
  if (!userId) return;
  try {
    window.localStorage.setItem(seenKey(userId), JSON.stringify(states));
  } catch {
    // Storage unavailable: skip.
  }
}
