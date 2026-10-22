import type { CourseOverview } from '@loophole/shared';
import { ArrowRight, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { LanguageTile } from '@/components/language-logo';
import { ProgressBar } from '@/components/progress-bar';
import { chip, stickerCard } from '@/components/ui/card';

// Job-focused paths (ADR-045): a goal, and the courses that get you there
// in order. They only group existing courses, so they live here and use
// the catalog's progress; a slug not in the catalog is skipped.
export const CAREER_PATHS: {
  id: string;
  title: string;
  goal: string;
  courses: string[];
}[] = [
  {
    id: 'frontend',
    title: 'Frontend developer',
    goal: 'Build web pages that look good and do things, and put them online.',
    courses: ['html-css', 'javascript', 'git-github'],
  },
  {
    id: 'python',
    title: 'Python programmer',
    goal: 'Write programs that solve real problems, and share your code.',
    courses: ['python', 'git-github'],
  },
  {
    id: 'foundations',
    title: 'Programming foundations',
    goal: 'Two languages and Git: a strong start for any coding job.',
    courses: ['python', 'javascript', 'git-github'],
  },
];

// "Career paths" on the catalog: each path's courses as a chain, overall
// progress, and the next course to open.
export function CareerPaths({ courses }: { courses: CourseOverview[] }) {
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const paths = CAREER_PATHS.map((p) => ({
    ...p,
    steps: p.courses.flatMap((slug) => bySlug.get(slug) ?? []),
  })).filter((p) => p.steps.length > 0);
  if (paths.length === 0) return null;

  return (
    <section aria-labelledby="paths-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="paths-heading" className="font-display text-2xl font-extrabold">
          Career paths
        </h2>
        <p className="text-text-secondary">
          Not sure where to start? Pick a goal and follow its courses in order.
        </p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2">
        {paths.map((p) => {
          const total = p.steps.reduce((n, c) => n + c.lessonCount, 0);
          const done = p.steps.reduce(
            (n, c) => n + Math.min(c.completedCount, c.lessonCount),
            0,
          );
          const next = p.steps.find((c) => c.completedCount < c.lessonCount);
          return (
            <li key={p.id} className={`${stickerCard} flex flex-col gap-3 p-5`}>
              <span className={`${chip} self-start bg-lemon text-ink`}>
                <Briefcase className="size-3.5" strokeWidth={3} aria-hidden />{' '}
                Path
              </span>
              <h3 className="font-display text-xl font-extrabold">{p.title}</h3>
              <p className="text-sm text-text-secondary">{p.goal}</p>
              <ol
                aria-label={`${p.title} courses`}
                className="flex flex-wrap items-center gap-2"
              >
                {p.steps.map((c, i) => (
                  <li key={c.slug} className="flex items-center gap-2">
                    {i > 0 && (
                      <ArrowRight
                        className="size-4 text-text-secondary"
                        strokeWidth={3}
                        aria-hidden
                      />
                    )}
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <LanguageTile language={c.language} size="sm" />
                      {c.title}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    value={done}
                    max={total || 1}
                    label={`${p.title} progress`}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {done} / {total}
                </span>
              </div>
              {next ? (
                <Link
                  href={`/learn/${next.slug}`}
                  className="mt-auto inline-flex items-center gap-1 self-start rounded-badge font-bold underline hover:text-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {done === 0 ? 'Start with' : 'Next:'} {next.title}
                  <ArrowRight className="size-4" strokeWidth={3} aria-hidden />
                </Link>
              ) : (
                <p className="mt-auto font-bold">Path complete!</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
