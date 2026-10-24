import type { ReactNode } from 'react';

// The lesson's bottom bar (ADR-029): fixed to the screen's foot so
// Continue never moves. Its tone answers the learner: Blue-tint for a
// right answer, Surface for a wrong one. The page pads its own bottom
// (pb-36) while a bar is showing.
const TONES = {
  plain: 'bg-paper',
  right: 'bg-violet-tint',
  wrong: 'bg-surface',
};

export function ActionBar({
  tone = 'plain',
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-border-muted pb-[env(safe-area-inset-bottom)] transition-colors ${TONES[tone]}`}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {children}
      </div>
    </div>
  );
}
