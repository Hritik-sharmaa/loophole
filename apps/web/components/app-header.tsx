'use client';

import { Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMe } from '@/lib/queries/use-me';
import { useCountUp } from '@/lib/use-count-up';
import { useSession } from '@/lib/use-session';

// short: the label on phone-width screens, so four links fit one line.
const LINKS = [
  { href: '/learn', label: 'Learn' },
  { href: '/duels', label: 'Duels' },
  { href: '/leaderboard', label: 'Leaderboard', short: 'Ranks' },
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
              label={`${me.data.streak.current} day streak${me.data.streak.freezes > 0 ? `, ${me.data.streak.freezes} freeze${me.data.streak.freezes === 1 ? '' : 's'} saved` : ''}`}
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
          {LINKS.map(({ href, label, short }) => {
            const current =
              pathname === href ||
              (href === '/learn' && pathname.startsWith('/lessons'));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`rounded-badge px-2 py-1.5 sm:px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-ink ${current ? 'bg-surface text-ink' : 'text-text-secondary'}`}
                >
                  {short ? (
                    <>
                      <span className="sm:hidden">{short}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </>
                  ) : (
                    label
                  )}
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
  // Counts up when XP or the streak grows (DESIGN_SYSTEM §5).
  const shown = useCountUp(value);
  return (
    <span
      title={label}
      className="flex items-center gap-1 text-xs font-semibold text-ink"
    >
      <span className="text-orange" aria-hidden>
        {icon}
      </span>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
