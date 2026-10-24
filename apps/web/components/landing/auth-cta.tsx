'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/lib/use-session';
import { primaryButton } from '@/components/ui/buttons';

// The small ink circle with an arrow that ends a landing-page button.
export function ArrowBadge({ tone = 'ink' }: { tone?: 'ink' | 'orange' }) {
  return (
    <span
      aria-hidden
      className={`-mr-3 grid size-7 shrink-0 place-items-center rounded-full ${tone === 'ink' ? 'bg-ink text-sun' : 'bg-orange text-ink'}`}
    >
      <ArrowUpRight className="size-4" strokeWidth={3} />
    </span>
  );
}

// The nav's right side: "Log in" and "Start free" for visitors, "Open
// app" once signed in.
export function NavAuthButton() {
  const { session } = useSession();

  return session ? (
    <Link href="/learn" className={`${primaryButton} py-2 pr-5 text-sm`}>
      Open app <ArrowBadge />
    </Link>
  ) : (
    <div className="flex items-center gap-4">
      <Link
        href="/login"
        className="rounded-badge text-sm font-bold hover:text-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
      >
        Log in
      </Link>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-border-muted bg-paper py-1.5 pr-4 pl-4 text-sm font-bold transition-colors hover:border-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
      >
        Start free <ArrowBadge tone="orange" />
      </Link>
    </div>
  );
}
