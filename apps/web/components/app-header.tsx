'use client';

import { Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { chip } from '@/components/ui/card';
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
    <header className="border-b-2 border-ink bg-paper">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Logo href="/learn" size="sm" />

        {/* StreakBadge / XpBadge (DESIGN_SYSTEM §6). Hidden on narrow
            screens, where the profile page shows the same numbers. */}
        {me.data && (
          <div className="hidden items-center gap-2 md:flex">
            <Badge
              icon={<Flame className="size-3.5" fill="currentColor" />}
              label={`${me.data.streak.current} day streak${me.data.streak.freezes > 0 ? `, ${me.data.streak.freezes} freeze${me.data.streak.freezes === 1 ? '' : 's'} saved` : ''}`}
              value={me.data.streak.current}
            />
            <Badge
              icon={<Zap className="size-3.5" fill="currentColor" />}
              label={`${me.data.xp} XP`}
              value={me.data.xp}
              suffix=" xp"
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
                  className={`rounded-badge border-2 px-2 py-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:px-3 ${current ? 'border-ink bg-ink text-paper' : 'border-transparent text-text-secondary hover:border-ink hover:text-ink'}`}
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

// A Lemon reward chip: Ink text, Orange icon.
function Badge({
  icon,
  label,
  value,
  suffix = '',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  // Counts up when XP or the streak grows (DESIGN_SYSTEM §5).
  const shown = useCountUp(value);
  return (
    <span title={label} className={`${chip} bg-lemon text-ink`}>
      <span className="text-orange-dark" aria-hidden>
        {icon}
      </span>
      <span aria-hidden className="tabular-nums">
        {shown}
        {suffix}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
