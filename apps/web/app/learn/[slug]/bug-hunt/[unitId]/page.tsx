'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { GUIDES, Guide, guideFor, type GuideId } from '@/components/guide';
import { LessonTopBar } from '@/components/lesson-top-bar';
import { SpotTheBug } from '@/components/spot-the-bug';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { stickerCard } from '@/components/ui/card';
import { useBugHunt, useCoursePath } from '@/lib/queries/use-lessons';
import { useRequireSession } from '@/lib/use-require-session';
import { PageLoader } from '@/components/page-loader';

// A unit's Bug hunt (ADR-031): every spot-the-bug card from the unit, one
// after another, full screen like a lesson. Practice only: nothing is
// recorded and no XP is paid.
export default function BugHuntPage() {
  const { slug, unitId } = useParams<{ slug: string; unitId: string }>();
  const { loading } = useRequireSession();
  const hunt = useBugHunt(slug, unitId, !loading);
  // For the course's guide and logo; usually already cached from the path.
  const path = useCoursePath(slug, !loading);
  const language = path.data?.course.language;
  const guide = guideFor(language);

  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const bugs = hunt.data?.bugs ?? [];

  function next(foundFirstTry: boolean) {
    if (foundFirstTry) setFirstTry((n) => n + 1);
    if (index === bugs.length - 1) setDone(true);
    else setIndex(index + 1);
    window.scrollTo({ top: 0 });
  }

  function again() {
    setIndex(0);
    setFirstTry(0);
    setDone(false);
  }

  return (
    <>
      <LessonTopBar
        backHref={`/learn/${slug}`}
        language={language}
        value={done ? bugs.length : index}
        max={Math.max(bugs.length, 1)}
      />
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8 ${hunt.data && !done && bugs.length > 0 ? 'pb-44' : ''}`}
      >
        {loading || hunt.isPending ? (
          <PageLoader label="Loading the bug hunt…" />
        ) : hunt.isError ? (
          <Message guide={guide} slug={slug} text={hunt.error.message} />
        ) : bugs.length === 0 ? (
          <Message
            guide={guide}
            slug={slug}
            text="This unit has no bugs to hunt yet."
          />
        ) : done ? (
          <HuntComplete
            guide={guide}
            slug={slug}
            firstTry={firstTry}
            total={bugs.length}
            onAgain={again}
          />
        ) : (
          <article className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-bold text-text-secondary">
                Bug hunt · {hunt.data.title} · {index + 1} of {bugs.length}
              </p>
              <h1 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
                {bugs[index].lesson}
              </h1>
            </div>
            <SpotTheBug
              // Each bug starts fresh.
              key={index}
              guide={guide}
              card={bugs[index]}
              nextLabel={index === bugs.length - 1 ? 'Finish' : 'Next bug'}
              onNext={next}
            />
          </article>
        )}
      </main>
    </>
  );
}

function HuntComplete({
  guide,
  slug,
  firstTry,
  total,
  onAgain,
}: {
  guide: GuideId;
  slug: string;
  firstTry: number;
  total: number;
  onAgain: () => void;
}) {
  const { name, cheer, tint } = GUIDES[guide];
  return (
    <section
      role="status"
      className={`${stickerCard} flex flex-col items-center gap-5 overflow-hidden px-6 pb-8 text-center`}
    >
      <div
        className="-mx-6 flex w-[calc(100%+3rem)] justify-center border-b border-border-muted pt-6"
        style={{ backgroundColor: tint }}
      >
        <Guide
          guide={guide}
          mood="happy"
          label={`${name} cheering`}
          className="h-48 w-[137px]"
        />
      </div>
      <h1 className="font-display text-4xl font-semibold">Bug hunt done!</h1>
      <p className="text-lg">
        <span className="font-bold">{name}:</span> “{cheer} You found{' '}
        <span className="font-bold">
          {firstTry} of {total}
        </span>{' '}
        bugs on the first try.”
      </p>
      <p className="text-sm font-bold text-text-secondary">
        Practice only: no XP, nothing saved. Hunt again any time.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href={`/learn/${slug}`} className={`${primaryButton} uppercase`}>
          Continue
        </Link>
        <button type="button" onClick={onAgain} className={secondaryButton}>
          Hunt again
        </button>
      </div>
    </section>
  );
}

function Message({
  guide,
  slug,
  text,
}: {
  guide: GuideId;
  slug: string;
  text: string;
}) {
  return (
    <div
      role="alert"
      className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-12 text-center`}
    >
      <Guide guide={guide} mood="oops" className="h-28 w-20" />
      <p className="font-display text-2xl font-semibold">{text}</p>
      <Link href={`/learn/${slug}`} className={secondaryButton}>
        Back to the path
      </Link>
    </div>
  );
}
