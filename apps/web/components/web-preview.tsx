'use client';

import { useEffect, useState } from 'react';

// How long typing must pause before the preview redraws.
const DEBOUNCE_MS = 300;

// The live preview for web exercises and examples (ADR-024). The learner's
// HTML renders in an iframe with an empty sandbox: no scripts, no forms, no
// popups, and no access to this page, its cookies or its storage. It shows
// the page; it never grades it (the API does that).
export function WebPreview({
  html,
  className = 'h-64',
}: {
  html: string;
  className?: string;
}) {
  const [shown, setShown] = useState(html);
  useEffect(() => {
    const timer = setTimeout(() => setShown(html), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [html]);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border-muted bg-paper">
      <div className="flex items-center gap-2 border-b border-border-muted bg-surface px-4 py-1.5">
        <span aria-hidden className="size-2 rounded-full bg-violet" />
        <h2 className="text-xs font-bold tracking-wide text-text-secondary uppercase">
          Live preview
        </h2>
      </div>
      <iframe
        title="Live preview of your page"
        sandbox=""
        srcDoc={shown}
        className={`w-full bg-white ${className}`}
      />
    </section>
  );
}
