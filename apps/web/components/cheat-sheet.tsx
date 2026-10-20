'use client';

import { BookOpen, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { InlineCode } from '@/components/inline-code';
import { secondaryButton } from '@/components/ui/buttons';
import { useCheatSheet } from '@/lib/queries/use-lessons';

// A unit's cheat sheet (ADR-030): its lessons' Learn cards on one page,
// in a native <dialog> (focus trap, Esc to close, no library). Loaded the
// first time it's opened, then kept.
export function CheatSheet({
  slug,
  unitId,
  unitTitle,
}: {
  slug: string;
  unitId: string;
  unitTitle: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const sheet = useCheatSheet(slug, unitId, opened);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened(true);
          dialog.current?.showModal();
        }}
        className={`${secondaryButton} px-3 py-1.5 text-sm`}
      >
        <BookOpen className="size-4" strokeWidth={3} aria-hidden /> Cheat sheet
      </button>

      <dialog
        ref={dialog}
        aria-label={`Cheat sheet: ${unitTitle}`}
        // Clicking the backdrop (the dialog itself, outside the panel) closes.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-[85dvh] w-[min(42rem,calc(100%-2rem))] overflow-hidden rounded-card border-2 border-ink bg-paper p-0 text-ink shadow-sticker backdrop:bg-ink/60"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b-2 border-ink bg-lemon px-5 py-3">
            <div>
              <p className="text-xs font-bold tracking-wide uppercase">
                Cheat sheet
              </p>
              <h2 className="font-display text-2xl font-extrabold">
                {unitTitle}
              </h2>
            </div>
            <form method="dialog">
              <button
                aria-label="Close the cheat sheet"
                className="rounded-badge p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <X className="size-6" strokeWidth={3} />
              </button>
            </form>
          </header>

          <div className="flex flex-col gap-8 overflow-y-auto px-5 py-5">
            {sheet.isPending ? (
              <p className="text-text-secondary">Loading the cheat sheet…</p>
            ) : sheet.isError ? (
              <p role="alert">
                ✕ Could not load the cheat sheet: {sheet.error.message}
              </p>
            ) : (
              sheet.data.lessons.map((lesson, i) => (
                <section key={lesson.title} className="flex flex-col gap-3">
                  <h3 className="font-display text-xl font-extrabold">
                    <span className="text-text-secondary">{i + 1}.</span>{' '}
                    {lesson.title}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {lesson.cards.map((card) => (
                      <li
                        key={card.title}
                        className="flex flex-col gap-2 rounded-card border-2 border-ink bg-canvas px-4 py-3"
                      >
                        <p className="font-bold">{card.title}</p>
                        <p>
                          <InlineCode text={card.body} />
                        </p>
                        {card.code && (
                          <pre className="overflow-x-auto rounded-badge bg-ink px-3 py-2 font-mono text-sm leading-6 text-canvas">
                            {card.code.trimEnd()}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
