'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { AvatarArt, bgHex, parseAvatar } from '@/components/avatar';
import { Guide, GUIDES, type GuideId } from '@/components/guide';
import { LanguageTile } from '@/components/language-logo';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { SectionHead } from './section-head';

// The courses (ADR-047, ADR-048). First the course as a map, scrubbed by
// scroll: the road draws itself, an avatar walks along it, each book pops
// up as the avatar reaches it, and the ground turns from spring to autumn.
// The books are the first Python unit's six real lessons; the house is its
// project. On phones the map is wider than the screen and pans with the
// walker. Under it, the four courses with their real counts.

const ROAD =
  'M 40 300 C 160 300 180 120 320 120 S 480 300 620 290 S 800 110 960 130';

// Points on ROAD at even fractions of its length (worked out once with
// getPointAtLength), with the lesson standing there.
const BOOKS = [
  { x: 111, y: 275, at: 0.07, title: 'Hello, world', cover: '#FFD43B' },
  { x: 219, y: 160, at: 0.215, title: 'Greet by name', cover: '#FF9CC8' },
  { x: 366, y: 127, at: 0.36, title: 'Add two numbers', cover: '#82CCF8' },
  { x: 487, y: 227, at: 0.505, title: 'Area of a rectangle', cover: '#B7A3FF' },
  { x: 625, y: 290, at: 0.65, title: 'Minutes to hours', cover: '#7FDDB8' },
  { x: 763, y: 216, at: 0.795, title: 'The last digit', cover: '#FFB56B' },
];
const HOUSE = { x: 928, y: 128, title: 'Project: Samosa party' };

// The four courses, with the counts in content/ (lessons, then projects).
const COURSES: {
  slug: string;
  language: string;
  name: string;
  guide: GuideId;
  text: string;
  lessons: number;
  projects: number;
}[] = [
  {
    slug: 'python',
    language: 'python',
    name: 'Python',
    guide: 'priya',
    text: 'Print, variables, decisions, loops, lists, functions and dictionaries.',
    lessons: 40,
    projects: 7,
  },
  {
    slug: 'javascript',
    language: 'javascript',
    name: 'JavaScript',
    guide: 'arjun',
    text: 'From your first console.log() to arrays, arrow functions and objects.',
    lessons: 20,
    projects: 5,
  },
  {
    slug: 'html-css',
    language: 'html',
    name: 'HTML & CSS',
    guide: 'meera',
    text: 'Build real web pages and style them, with a live preview as you type.',
    lessons: 15,
    projects: 3,
  },
  {
    slug: 'git',
    language: 'git',
    name: 'Git & GitHub',
    guide: 'harpreet',
    text: 'Commit, branch, merge and share on GitHub, in a safe practice terminal.',
    lessons: 15,
    projects: 3,
  },
];

const TREES: [number, number, number][] = [
  [60, 110, 16],
  [190, 360, 13],
  [370, 330, 15],
  [520, 70, 14],
  [690, 372, 12],
  [860, 300, 16],
  [985, 330, 11],
];

const WALKER = 's3.dots.fluffy.black.hoodie.violet.none.cat.none.lilac';

export function MapWalk() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const frame = root.current?.querySelector<HTMLElement>('[data-map]');
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: '[data-map]',
            start: 'top 78%',
            end: 'bottom 30%',
            scrub: 0.8,
          },
        });
        // On phones the map is wider than its frame: keep the walker in the
        // middle of it (the browser clamps at both ends).
        const walker = root.current?.querySelector('[data-walker]');
        tl.eventCallback('onUpdate', () => {
          if (!frame || !walker || frame.scrollWidth <= frame.clientWidth)
            return;
          const w = walker.getBoundingClientRect();
          const f = frame.getBoundingClientRect();
          frame.scrollLeft += w.left + w.width / 2 - (f.left + f.width / 2);
        });
        // fromTo with explicit ends throughout: React runs effects twice in
        // development, and from() would then record the hidden state as
        // the place to animate to.
        tl.fromTo(
          '[data-road], [data-road-path], [data-road-line]',
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 1 },
          0,
        )
          .to(
            '[data-walker]',
            {
              motionPath: {
                path: '[data-road-path]',
                align: '[data-road-path]',
                alignOrigin: [0.5, 0.5],
              },
              duration: 1,
            },
            0,
          )
          .fromTo(
            '[data-autumn]',
            { opacity: 0 },
            { opacity: 1, duration: 1 },
            0,
          )
          .fromTo(
            '[data-season="spring"]',
            { autoAlpha: 1, yPercent: 0 },
            { autoAlpha: 0, yPercent: -100, duration: 0.12 },
            0.5,
          )
          .fromTo(
            '[data-season="autumn"]',
            { autoAlpha: 0, yPercent: 100 },
            { autoAlpha: 1, yPercent: 0, duration: 0.12 },
            0.5,
          );
        gsap.utils.toArray<SVGGElement>('[data-book]').forEach((book, i) => {
          tl.fromTo(
            book,
            { scale: 0, y: 20, transformOrigin: '50% 100%' },
            { scale: 1, y: 0, duration: 0.08, ease: 'back.out(3)' },
            BOOKS[i].at - 0.03,
          );
        });
        tl.fromTo(
          '[data-house]',
          { scale: 0, transformOrigin: '50% 100%' },
          { scale: 1, duration: 0.06, ease: 'back.out(3)' },
          0.92,
        );
      });
    },
    { scope: root },
  );

  const walker = parseAvatar(WALKER);

  return (
    <section
      ref={root}
      id="courses"
      className="mx-auto flex max-w-6xl scroll-mt-16 flex-col gap-10 px-4 pt-20 pb-12 sm:px-6 lg:pt-28 lg:pb-16"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <SectionHead
          label="The courses"
          title={
            <>
              Every lesson is a book
              <br className="hidden sm:block" /> on the road.
            </>
          }
        />
        <p className="max-w-[38ch] text-lg text-text-secondary">
          Units are seasons, projects are houses, and your avatar walks the road
          as you learn. Scroll to watch the first Python unit fill in.
        </p>
      </div>

      <div className="relative">
        <div
          data-map
          className="overflow-x-auto rounded-[2.25rem] border border-border-muted [scrollbar-width:none]"
        >
          <svg
            viewBox="0 0 1000 400"
            className="block w-full min-w-[760px] sm:min-w-0"
            role="img"
            aria-label="The first Python unit as a map: five lessons on a road, ending at a house for the project"
          >
            <defs>
              <linearGradient id="map-spring" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#E6F8EE" />
                <stop offset="1" stopColor="#CDEFDC" />
              </linearGradient>
              <linearGradient id="map-autumn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFF0E3" />
                <stop offset="1" stopColor="#FFDCC0" />
              </linearGradient>
              <clipPath id="map-walker-clip">
                <circle cx="0" cy="0" r="26" />
              </clipPath>
            </defs>
            <rect width="1000" height="400" fill="url(#map-spring)" />
            <rect
              data-autumn
              width="1000"
              height="400"
              fill="url(#map-autumn)"
              opacity="0"
            />
            <ellipse
              cx="120"
              cy="430"
              rx="220"
              ry="80"
              fill="#fff"
              opacity=".35"
            />
            <ellipse
              cx="880"
              cy="440"
              rx="240"
              ry="90"
              fill="#fff"
              opacity=".35"
            />
            <g fill="#fff" opacity=".85">
              <rect x="250" y="40" width="90" height="22" rx="11" />
              <rect x="270" y="28" width="40" height="28" rx="14" />
              <rect x="640" y="48" width="110" height="22" rx="11" />
            </g>

            {TREES.map(([x, y, r]) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                <rect
                  x="-3"
                  y={r - 4}
                  width="6"
                  height="16"
                  rx="3"
                  fill="#A77B5B"
                />
                <circle r={r} fill="#52C99E" />
                <circle cx={-r / 3} cy={-r / 3} r={r / 2.6} fill="#8CE3C2" />
              </g>
            ))}

            <path
              data-road
              d={ROAD}
              fill="none"
              stroke="#BFE6D0"
              strokeWidth="54"
              strokeLinecap="round"
            />
            <path
              data-road-path
              d={ROAD}
              fill="none"
              stroke="#FFF8EA"
              strokeWidth="42"
              strokeLinecap="round"
            />
            <path
              data-road-line
              d={ROAD}
              fill="none"
              stroke="#F1DDB3"
              strokeWidth="3"
              strokeDasharray="10 12"
              strokeLinecap="round"
            />

            {BOOKS.map((b, i) => (
              <g key={b.title} data-book>
                <g
                  transform={`translate(${b.x - 22} ${b.y - 64}) rotate(${i % 2 ? 4 : -4} 22 28)`}
                >
                  <rect x="4" y="3" width="40" height="52" rx="5" fill="#fff" />
                  <rect width="40" height="54" rx="6" fill={b.cover} />
                  <rect width="7" height="54" rx="3" fill="#000" opacity=".1" />
                  <text
                    x="23"
                    y="36"
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="600"
                    fill="#1E1638"
                    className="font-display"
                  >
                    {i + 1}
                  </text>
                </g>
                <g transform={`translate(${b.x} ${b.y + 20})`}>
                  <rect
                    x={-b.title.length * 3.6 - 10}
                    y="-11"
                    width={b.title.length * 7.2 + 20}
                    height="22"
                    rx="11"
                    fill="#fff"
                  />
                  <text
                    textAnchor="middle"
                    y="4.5"
                    fontSize="12"
                    fontWeight="700"
                    fill="#1E1638"
                    className="font-sans"
                  >
                    {b.title}
                  </text>
                </g>
              </g>
            ))}

            <g data-house>
              <g transform={`translate(${HOUSE.x - 34} ${HOUSE.y - 76})`}>
                <rect
                  x="10"
                  y="28"
                  width="48"
                  height="36"
                  rx="5"
                  fill="#FF9CC8"
                />
                <path d="M2 32 L34 6 L66 32 Z" fill="#6A4DF4" />
                <rect x="27" y="42" width="14" height="22" rx="3" fill="#fff" />
                <rect x="15" y="36" width="9" height="8" rx="2" fill="#fff" />
                <rect x="44" y="36" width="9" height="8" rx="2" fill="#fff" />
              </g>
              <g transform={`translate(${HOUSE.x - 30} ${HOUSE.y + 20})`}>
                <rect
                  x="-68"
                  y="-11"
                  width="136"
                  height="22"
                  rx="11"
                  fill="#6A4DF4"
                />
                <text
                  textAnchor="middle"
                  y="4.5"
                  fontSize="12"
                  fontWeight="700"
                  fill="#fff"
                  className="font-sans"
                >
                  {HOUSE.title}
                </text>
              </g>
            </g>

            {/* The walker starts at the beginning of the road. */}
            <g data-walker transform="translate(40 300)">
              <circle r="30" fill="#fff" />
              <g clipPath="url(#map-walker-clip)">
                <circle r="26" fill={bgHex(walker.bg)} />
                <g transform="translate(-26 -26) scale(0.26)">
                  <AvatarArt parts={walker} />
                </g>
              </g>
            </g>
          </svg>
        </div>

        {/* The season changes unit by unit; here it turns as you scroll. */}
        <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-full bg-paper/90 py-1.5 pr-3.5 pl-2 text-xs font-bold shadow-sticker-sm backdrop-blur sm:top-5 sm:left-5 sm:text-sm">
          <span className="rounded-full bg-violet px-2 py-0.5 text-paper">
            Python
          </span>
          <span className="relative inline-block h-5 w-28 overflow-hidden">
            <span
              data-season="spring"
              className="absolute inset-0 flex items-center gap-1.5"
            >
              <span className="size-2.5 rounded-full bg-tile-mint" /> Spring
              unit
            </span>
            <span
              data-season="autumn"
              className="invisible absolute inset-0 flex items-center gap-1.5"
            >
              <span className="size-2.5 rounded-full bg-tile-orange" /> Autumn
              unit
            </span>
          </span>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COURSES.map((c) => (
          <li key={c.slug}>
            <Link
              href="/login"
              className="group flex h-full flex-col gap-4 rounded-card border border-border-muted bg-paper p-5 transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-violet hover:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            >
              <div className="flex items-center justify-between">
                <LanguageTile language={c.language} />
                <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  with {GUIDES[c.guide].name}
                  <Guide guide={c.guide} crop="bust" className="size-9" />
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <h3 className="font-display text-xl font-semibold">{c.name}</h3>
                <p className="text-sm text-text-secondary">{c.text}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border-muted pt-4 text-sm">
                <span className="font-semibold">
                  {c.lessons} lessons · {c.projects} projects
                </span>
                <span
                  aria-hidden
                  className="grid size-7 place-items-center rounded-full bg-canvas text-violet transition-colors group-hover:bg-violet group-hover:text-paper"
                >
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
