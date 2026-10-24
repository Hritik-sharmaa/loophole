'use client';

import type { CoursePath, LessonState } from '@loophole/shared';
import { Award, Bug, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheatSheet } from '@/components/cheat-sheet';
import { CourseBanner } from '@/components/course-banner';
import { GUIDES, Guide, guideFor } from '@/components/guide';
import { LessonNode } from '@/components/lesson-node';
import { ProgressBar } from '@/components/progress-bar';
import { BugSticker, Tile, TrophySticker } from '@/components/stickers';
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
  type Point,
} from '@/lib/path-geometry';

type States = Record<string, LessonState>;

const STATE_LABEL: Record<LessonState, string> = {
  completed: 'completed',
  active: 'start here',
  locked: 'locked',
};

// The lesson path as a map (DESIGN_SYSTEM §6 LessonPath, ADR-047): each
// unit is a little world, its lessons are books on a winding road, and
// the part already walked is marked in Violet footprints.
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
  // The Bug hunt reviews the lessons' bug cards, so it opens with them done,
  // whether or not the unit's project is (ADR-043).
  const lessonsDone = path.units.map((unit) =>
    unit.lessons.every((l) => l.project || l.state === 'completed'),
  );

  return (
    // Wide screens: the road on the left, the course card and a list of
    // units to jump to in a sticky column on the right.
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:order-2 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
        <header className={`${stickerCard} overflow-hidden`}>
          <CourseBanner
            language={path.course.language}
            className="h-32 border-b border-border-muted sm:h-40 lg:h-28"
          />
          <div className="flex items-center gap-5 px-5 py-5">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl lg:text-3xl">
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
                      <UnitBadge
                        number={u + 1}
                        earned={got}
                        className="size-7"
                      />
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

        <nav
          aria-label="Units"
          className={`${stickerCard} hidden flex-col gap-0.5 p-3 lg:flex`}
        >
          <p className="px-2 pt-1 pb-2 text-sm font-bold text-text-secondary">
            Units
          </p>
          {path.units.map((unit, u) => (
            <a
              key={unit.id}
              href={`#unit-${unit.id}`}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            >
              <UnitBadge number={u + 1} earned={earned[u]} className="size-8" />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {unit.title}
              </span>
              <span className="text-xs font-bold text-text-secondary tabular-nums">
                {unit.lessons.filter((l) => l.state === 'completed').length}/
                {unit.lessons.length}
              </span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-12 lg:order-1">
        {path.units.map((unit, u) => {
          const points = layoutNodes(unit.lessons.length, firstIndex[u]);
          const done = donePointCount(unit.lessons.map((l) => l.state));
          const height = pathHeight(unit.lessons.length);
          const unitDone = unit.lessons.filter(
            (l) => l.state === 'completed',
          ).length;

          return (
            <section
              key={unit.id}
              id={`unit-${unit.id}`}
              className="flex scroll-mt-24 flex-col items-center gap-8"
            >
              <div
                className={`${stickerCard} flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4`}
              >
                <div className="flex items-center gap-3">
                  <UnitBadge number={u + 1} earned={earned[u]} />
                  <div className="flex flex-col items-start gap-1">
                    <span className={`${chip} bg-lemon text-ink`}>
                      Unit {u + 1} · {unitDone}/{unit.lessons.length}
                    </span>
                    <h2 className="font-display text-2xl font-semibold">
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

              <UnitMap
                season={SEASONS[u % SEASONS.length]}
                points={points}
                done={done}
                height={height}
              >
                <ol>
                  {unit.lessons.map((lesson, i) => {
                    const node = (
                      <>
                        <LessonNode
                          state={lesson.state}
                          number={firstIndex[u] + i + 1}
                          pop={popping.has(lesson.id)}
                          project={lesson.project}
                        />
                        <span
                          className={`rounded-badge bg-paper/90 px-2.5 py-0.5 text-center text-sm leading-tight font-bold shadow-sticker-sm ${lesson.state === 'locked' ? 'text-text-secondary' : 'text-ink'}`}
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
                      <motion.li
                        key={lesson.id}
                        className="absolute w-36"
                        initial={{ opacity: 0, y: 18, scale: 0.85 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 18,
                          delay: 0.15 + i * 0.07,
                        }}
                        style={{
                          left: points[i].x - 72,
                          top: ROAD_LEAD + points[i].y - 40,
                        }}
                      >
                        {lesson.state === 'locked' ? (
                          <div
                            aria-disabled="true"
                            title={
                              lesson.project
                                ? 'Finish this unit to open its project'
                                : 'Finish the previous lesson first'
                            }
                            className="flex flex-col items-center gap-1.5"
                          >
                            {node}
                          </div>
                        ) : (
                          <Link
                            href={`/lessons/${lesson.id}`}
                            className="group flex flex-col items-center gap-1.5 rounded-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
                          >
                            {node}
                          </Link>
                        )}
                      </motion.li>
                    );
                  })}
                </ol>
              </UnitMap>

              {unit.bugs > 0 && (
                <BugHuntStop
                  href={`/learn/${path.course.slug}/bug-hunt/${unit.id}`}
                  bugs={unit.bugs}
                  open={lessonsDone[u]}
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
    </div>
  );
}

// How the road and its centre line appear the first time a unit scrolls
// into view.
const drawIn = {
  initial: { pathLength: 0 },
  whileInView: { pathLength: 1 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 1.4, ease: 'easeInOut' },
} as const;
const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.5, delay: 1.1 },
} as const;

// The road runs this far above the first book and below the last, so it
// enters and leaves the unit's map.
const ROAD_LEAD = 48;

type Season = {
  ground: [string, string];
  // The road's edge and the hills.
  edge: string;
  leaf: string;
  leafLight: string;
  water: string;
  // Winter trees wear a little snow.
  snow?: boolean;
};

// Each unit is a season, like the reading app the developer picked
// (ADR-047): spring, summer, autumn, winter, then round again.
const SEASONS: Season[] = [
  {
    ground: ['#E6F8EE', '#D3F1E2'],
    edge: '#BFE6D0',
    leaf: '#52C99E',
    leafLight: '#8CE3C2',
    water: '#BFE0FF',
  },
  {
    ground: ['#FFF7DE', '#FFEDC2'],
    edge: '#F4DCA4',
    leaf: '#7FDDB8',
    leafLight: '#B5EFD8',
    water: '#A8DBFF',
  },
  {
    ground: ['#FFF0E3', '#FFDFC6'],
    edge: '#F3CBA8',
    leaf: '#FFB56B',
    leafLight: '#FFD3A1',
    water: '#CFE0FF',
  },
  {
    ground: ['#EEF5FF', '#DBEBFD'],
    edge: '#C6DCF4',
    leaf: '#82CCF8',
    leafLight: '#C3E7FD',
    water: '#FFFFFF',
    snow: true,
  },
];

// A unit's little world: the ground, a cream road through the books with
// the walked part marked in Violet footprints, and scenery on the side of
// the road away from each book.
function UnitMap({
  season,
  points,
  done,
  height,
  children,
}: {
  season: Season;
  points: Point[];
  done: number;
  height: number;
  children: ReactNode;
}) {
  const total = height + ROAD_LEAD * 2;
  const shifted = points.map((p) => ({ x: p.x, y: p.y + ROAD_LEAD }));
  const road = pathThrough([
    { x: shifted[0].x, y: 0 },
    ...shifted,
    { x: shifted[shifted.length - 1].x, y: total },
  ]);
  const center = PATH_WIDTH / 2;
  return (
    <div
      className="relative w-full overflow-hidden rounded-[2rem] border border-border-muted"
      style={{
        background: `linear-gradient(180deg, ${season.ground[0]}, ${season.ground[1]})`,
      }}
    >
      {/* Clouds and hills for wide screens; the road column keeps its own
          scenery for phones. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute top-8 left-[6%] h-6 w-20 rounded-full bg-paper/80" />
        <span className="absolute top-5 left-[9%] h-8 w-10 rounded-full bg-paper/80" />
        <span className="absolute top-[38%] right-[7%] h-6 w-24 rounded-full bg-paper/70" />
        <span
          className="absolute -bottom-16 -left-10 h-40 w-64 rounded-[50%]"
          style={{ backgroundColor: season.edge }}
        />
        <span
          className="absolute -right-12 -bottom-20 h-44 w-72 rounded-[50%]"
          style={{ backgroundColor: season.edge }}
        />
      </div>
      <div
        className="relative mx-auto"
        style={{ width: PATH_WIDTH, height: total }}
      >
        <svg
          aria-hidden="true"
          width={PATH_WIDTH}
          height={total}
          viewBox={`0 0 ${PATH_WIDTH} ${total}`}
          fill="none"
          className="absolute inset-0 overflow-visible"
        >
          {shifted.map((p, i) => (
            <Scenery
              key={i}
              x={p.x >= center ? p.x - 118 : p.x + 118}
              y={p.y + 6}
              kind={i % 4}
              season={season}
            />
          ))}
          {/* The road draws itself the first time the unit is seen
              (ADR-048); its centre line and footprints follow. */}
          <motion.path
            d={road}
            stroke={season.edge}
            strokeWidth={46}
            strokeLinecap="round"
            {...drawIn}
          />
          <motion.path
            d={road}
            stroke="#FFF8EA"
            strokeWidth={36}
            strokeLinecap="round"
            {...drawIn}
          />
          <motion.path
            {...fadeIn}
            d={road}
            stroke="#F1DDB3"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="8 10"
          />
          {done >= 1 && (
            <motion.path
              {...fadeIn}
              d={pathThrough([
                { x: shifted[0].x, y: 0 },
                ...shifted.slice(0, done),
              ])}
              className="stroke-violet"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="0 14"
            />
          )}
        </svg>
        {children}
      </div>
    </div>
  );
}

// One piece of scenery: a tree, two trees, flowers or a pond.
function Scenery({
  x,
  y,
  kind,
  season,
}: {
  x: number;
  y: number;
  kind: number;
  season: Season;
}) {
  const tree = (dx: number, dy: number, r: number) => (
    <g key={`${dx}-${dy}`} transform={`translate(${dx} ${dy})`}>
      <rect x={-2.5} y={r - 4} width={5} height={14} rx={2} fill="#A77B5B" />
      <circle r={r} fill={season.leaf} />
      <circle cx={-r / 3} cy={-r / 3} r={r / 2.6} fill={season.leafLight} />
      {season.snow && (
        <path
          d={`M${-r * 0.8} ${-r * 0.4} Q0 ${-r * 1.5} ${r * 0.8} ${-r * 0.4} Q0 ${-r * 0.8} ${-r * 0.8} ${-r * 0.4}Z`}
          fill="#FFFFFF"
        />
      )}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      {kind === 0 && tree(0, 0, 13)}
      {kind === 1 && [tree(-8, 4, 10), tree(9, -2, 12)]}
      {kind === 2 && (
        <g>
          {[
            [-10, 0],
            [4, -6],
            [12, 6],
          ].map(([dx, dy]) => (
            <g key={dx} transform={`translate(${dx} ${dy})`}>
              <circle r={4} fill="#FFFFFF" />
              <circle r={1.8} fill="#FFC21A" />
            </g>
          ))}
        </g>
      )}
      {kind === 3 && (
        <g>
          <ellipse rx={26} ry={13} fill={season.water} />
          <ellipse
            cx={-6}
            cy={-3}
            rx={12}
            ry={4}
            fill="#FFFFFF"
            opacity={0.6}
          />
        </g>
      )}
    </g>
  );
}

// A unit's last stop (ADR-031): its Bug hunt, a review of the unit's
// spot-the-bug cards, on a glossy bug tile. It opens once the
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
          className="group flex flex-col items-center gap-1.5 rounded-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
        >
          <Tile
            tone="mint"
            className="size-16 transition-transform group-hover:-translate-y-1 group-active:scale-95"
          >
            <BugSticker />
          </Tile>
          <span className="font-display text-lg font-semibold">Bug hunt</span>
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
          <span className="font-display text-lg font-semibold text-text-secondary">
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

// The path's last stop (ADR-030): the course certificate. A trophy tile,
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
        className={`h-12 w-0 border-l-[6px] border-dotted ${slug ? 'border-violet' : 'border-border-muted'}`}
      />
      {slug ? (
        <Link
          href={`/c/${slug}`}
          className="group flex flex-col items-center gap-2 rounded-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
        >
          <Tile
            tone="sun"
            className="size-20 transition-transform group-hover:-translate-y-1 group-active:scale-95"
          >
            <TrophySticker />
          </Tile>
          <span className="font-display text-xl font-semibold">
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
          <span className="font-display text-xl font-semibold text-text-secondary">
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
