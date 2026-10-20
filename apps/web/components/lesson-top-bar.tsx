import { X } from 'lucide-react';
import Link from 'next/link';
import { LanguageTile } from '@/components/language-logo';
import { ProgressBar } from '@/components/progress-bar';

// The only header of a full-screen lesson or Bug hunt (ADR-029): leave,
// see how far along you are, or skip ahead (the Learn step teaches, it
// doesn't gate: ADR-021).
export function LessonTopBar({
  backHref,
  language,
  value,
  max,
  onSkip,
}: {
  backHref: string;
  language: string | undefined;
  value: number;
  max: number;
  onSkip?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href={backHref}
          aria-label="Leave the lesson"
          className="rounded-badge p-1 text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <X className="size-6" strokeWidth={3} />
        </Link>
        {language && <LanguageTile language={language} size="sm" />}
        <div className="flex-1">
          <ProgressBar value={value} max={max} label="Lesson progress" />
        </div>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-badge px-1 text-sm font-bold text-text-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Skip<span className="hidden sm:inline"> to practice</span>
          </button>
        )}
      </div>
    </header>
  );
}
