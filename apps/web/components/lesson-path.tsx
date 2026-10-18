'use client';

import type { CoursePath, LessonState } from '@loophole/shared';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LessonNode } from '@/components/lesson-node';
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
// down the page on a 6 px Surface track; the part already walked is Ink.
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

  return (
    <div className="flex flex-col gap-12">
      <h1 className="font-display text-4xl font-extrabold">
        {path.course.title}
      </h1>

      {path.units.map((unit, u) => {
        const points = layoutNodes(unit.lessons.length, firstIndex[u]);
        const done = donePointCount(unit.lessons.map((l) => l.state));
        const height = pathHeight(unit.lessons.length);

        return (
          <section key={unit.id} className="flex flex-col items-center gap-8">
            <div className="w-full rounded-card bg-ink px-5 py-4 text-paper">
              <p className="text-xs font-bold tracking-wide text-surface uppercase">
                Unit {u + 1}
              </p>
              <h2 className="font-display text-2xl font-extrabold">
                {unit.title}
              </h2>
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
                  className="stroke-surface"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                {done >= 2 && (
                  <path
                    d={pathThrough(points.slice(0, done))}
                    className="stroke-ink"
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
                        className={`rounded-badge bg-paper px-1 text-center text-sm leading-tight font-bold ${lesson.state === 'locked' ? 'text-text-tertiary' : 'text-ink'}`}
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
          </section>
        );
      })}
    </div>
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
