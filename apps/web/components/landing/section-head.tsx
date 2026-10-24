import type { ReactNode } from 'react';

// How every landing section after the hero opens: a short label, the
// headline and, optionally, one line of supporting text. Every section
// uses this, so headings line up on the same left edge down the page.

export function SectionHead({
  label,
  title,
  dark = false,
  children,
}: {
  label: string;
  title: ReactNode;
  // On the Violet duel band.
  dark?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p
        className={`flex items-center gap-2 text-sm font-bold ${dark ? 'text-sun' : 'text-violet'}`}
      >
        <span
          aria-hidden
          className={`h-0.5 w-6 rounded-full ${dark ? 'bg-sun' : 'bg-violet'}`}
        />
        {label}
      </p>
      <h2 className="font-display text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl">
        {title}
      </h2>
      {children}
    </div>
  );
}
