'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { GUIDES, Guide, guideFor, type GuideId } from '@/components/guide';
import { LessonTopBar } from '@/components/lesson-top-bar';
import { QuickCheck } from '@/components/quick-check';
import { SpotTheBug } from '@/components/spot-the-bug';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { stickerCard } from '@/components/ui/card';
import { usePractice } from '@/lib/queries/use-lessons';
import { useRequireSession } from '@/lib/use-require-session';

// The practice stop (ADR-037): quick checks and bug cards from lessons the
// learner already finished, mixed, older ones more often. Full screen like
// a lesson. Practice only: nothing is recorded and no XP is paid.
export default function PracticePage() {
  const { slug } = useParams<{ slug: string }>();
  const { loading } = useRequireSession();
  const practice = usePractice(slug, !loading);
  const language = practice.data?.course.language;
  const guide = guideFor(language);

  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const items = practice.data?.items ?? [];
  const item = items[index];

  function next(rightFirstTime: boolean) {
    if (rightFirstTime) setFirstTry((n) => n + 1);
    if (index === items.length - 1) setDone(true);
    else setIndex(index + 1);
    window.scrollTo({ top: 0 });
  }

  // A fresh mix: the query is never cached (usePractice).
  function again() {
    setIndex(0);
    setFirstTry(0);
    setDone(false);
    void practice.refetch();
  }

  const last = index === items.length - 1;
  const nextLabel = last ? 'Finish' : 'Next question';

  return (
    <>
      <LessonTopBar
        backHref={`/learn/${slug}`}
        language={language}
        value={done ? items.length : index}
        max={Math.max(items.length, 1)}
      />
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8 ${item && !done ? 'pb-44' : ''}`}
      >
        {loading || practice.isPending || practice.isFetching ? (
          <p className="text-text-secondary">Picking your questions…</p>
        ) : practice.isError ? (
          <Message guide={guide} slug={slug} text={practice.error.message} />
        ) : items.length === 0 ? (
          <Message
            guide={guide}
            slug={slug}
            text="Finish a lesson first, then come back to practise it."
          />
        ) : done ? (
          <PracticeComplete
            guide={guide}
            slug={slug}
            firstTry={firstTry}
            total={items.length}
            onAgain={again}
          />
        ) : (
          <article className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-bold text-text-secondary">
                Practice · {index + 1} of {items.length}
              </p>
              <h1 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
                {item.lesson}
              </h1>
            </div>
            {/* key: each question starts fresh. */}
            {item.kind === 'check' ? (
              <QuickCheck
                key={index}
                guide={guide}
                check={item.check}
                nextLabel={nextLabel}
                onDone={next}
              />
            ) : (
              <SpotTheBug
                key={index}
                guide={guide}
                card={item}
                nextLabel={nextLabel}
                onNext={next}
              />
            )}
          </article>
        )}
      </main>
    </>
  );
}

function PracticeComplete({
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
      <h1 className="font-display text-4xl font-semibold">Practice done!</h1>
      <p className="text-lg">
        <span className="font-bold">{name}:</span> “{cheer} You got{' '}
        <span className="font-bold">
          {firstTry} of {total}
        </span>{' '}
        right the first time.”
      </p>
      <p className="text-sm font-bold text-text-secondary">
        Practice only: no XP, nothing saved. A new mix every time.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href={`/learn/${slug}`} className={`${primaryButton} uppercase`}>
          Continue
        </Link>
        <button type="button" onClick={onAgain} className={secondaryButton}>
          Practise again
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
