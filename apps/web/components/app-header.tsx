'use client';

import { Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMe } from '@/lib/queries/use-me';
import { useSession } from '@/lib/use-session';

const LINKS = [
  { href: '/learn', label: 'Learn' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

// Top bar for the signed-in pages.
export function AppHeader() {
  const pathname = usePathname();
  const { session } = useSession();
  const me = useMe(!!session);

  return (
    <header className="border-b border-surface bg-paper">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
        <Link
          href="/learn"
          className="font-display text-2xl font-extrabold tracking-tight"
        >
          loop<span className="text-orange">hole</span>
        </Link>

        {/* XpBadge / StreakBadge (DESIGN_SYSTEM §6). Hidden on narrow
            screens, where the profile page shows the same numbers. */}
        {me.data && (
          <div className="hidden items-center gap-3 sm:flex">
            <Badge
              icon={<Flame className="size-4" fill="currentColor" />}
              label={`${me.data.streak.current} day streak`}
              value={me.data.streak.current}
            />
            <Badge
              icon={<Zap className="size-4" fill="currentColor" />}
              label={`${me.data.xp} XP`}
              value={me.data.xp}
            />
          </div>
        )}

        <ul className="flex gap-1">
          {LINKS.map(({ href, label }) => {
            const current =
              pathname === href ||
              (href === '/learn' && pathname.startsWith('/lessons'));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`rounded-badge px-3 py-1.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-ink ${current ? 'bg-surface text-ink' : 'text-text-secondary'}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

// Caption text in Ink, icon in Orange.
function Badge({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span
      title={label}
      className="flex items-center gap-1 text-xs font-semibold text-ink"
    >
      <span className="text-orange" aria-hidden>
        {icon}
      </span>
      <span aria-hidden>{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
