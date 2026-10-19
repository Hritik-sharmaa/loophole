'use client';

import type { CoursePath, LessonState } from '@loophole/shared';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Byte } from '@/components/byte';
import { LessonNode } from '@/components/lesson-node';
import { ProgressBar } from '@/components/progress-bar';
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

  return (
    <div className="flex flex-col gap-12">
      <header className={`${stickerCard} flex items-center gap-5 px-5 py-5`}>
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
        </div>
        <Byte
          mood={completed === lessons.length ? 'happy' : 'idle'}
          className="hidden size-20 shrink-0 sm:block"
        />
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
              <div className="flex flex-col items-start gap-1">
                <span className={`${chip} bg-lemon text-ink`}>
                  Unit {u + 1}
                </span>
                <h2 className="font-display text-2xl font-extrabold">
                  {unit.title}
                </h2>
              </div>
              <span className="text-sm font-bold text-text-secondary tabular-nums">
                {unitDone} / {unit.lessons.length}
              </span>
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
