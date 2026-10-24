'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Guide } from '@/components/guide';
import { LessonPath } from '@/components/lesson-path';
import { secondaryButton } from '@/components/ui/buttons';
import { stickerCard } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { useCoursePath } from '@/lib/queries/use-lessons';
import { useRequireSession } from '@/lib/use-require-session';

// One course's lesson path (ADR-023). The catalog lives at /learn.
export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const { session, loading } = useRequireSession();
  const path = useCoursePath(slug, !loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/learn"
          className="mb-6 inline-flex items-center gap-1 rounded-badge text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
        >
          <ArrowLeft className="size-4" strokeWidth={3} /> All courses
        </Link>

        {loading || path.isPending ? (
          <p className="text-center text-text-secondary">Loading your path…</p>
        ) : path.isError ? (
          <div
            role="alert"
            className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-12 text-center`}
          >
            <Guide guide="priya" mood="oops" className="h-32 w-24" />
            <p className="font-display text-2xl font-semibold">
              {path.error instanceof ApiError && path.error.status === 404
                ? 'No course here'
                : 'Could not load the path'}
            </p>
            <p className="text-text-secondary">{path.error.message}</p>
            <Link href="/learn" className={secondaryButton}>
              See all courses
            </Link>
          </div>
        ) : (
          <LessonPath path={path.data} userId={session?.user.id ?? null} />
        )}
      </main>
    </>
  );
}
