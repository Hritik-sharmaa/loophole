'use client';

import {
  BookOpen,
  Flame,
  Swords,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { chip } from '@/components/ui/card';
import { useMe } from '@/lib/queries/use-me';
import { useCountUp } from '@/lib/use-count-up';
import { useSession } from '@/lib/use-session';

// short: the label in the phone tab bar.
const LINKS: {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}[] = [
  { href: '/learn', label: 'Learn', short: 'Learn', icon: BookOpen },
  { href: '/duels', label: 'Duels', short: 'Duels', icon: Swords },
  { href: '/leaderboard', label: 'Leaderboard', short: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', short: 'Me', icon: UserRound },
];

// Signed-in navigation: a top bar, plus a bottom tab bar on phones (like an
// installed app). Below `sm` the links move to the tab bar and the top bar
// keeps the logo and the streak and XP chips.
export function AppHeader() {
  const pathname = usePathname();
  const { session } = useSession();
  const me = useMe(!!session);
  const isCurrent = (href: string) =>
    pathname === href || (href === '/learn' && pathname.startsWith('/lessons'));

  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper pt-[env(safe-area-inset-top)]">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/learn" size="sm" />

          {/* StreakBadge / XpBadge (DESIGN_SYSTEM §6). On phones they sit
              here; from md up beside the links; at sm the row is too
              narrow for both, and the profile page shows the numbers. */}
          {me.data && (
            <div className="flex items-center gap-2 sm:hidden md:flex">
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

          <ul className="hidden gap-1 sm:flex">
            {LINKS.map(({ href, label }) => {
              const current = isCurrent(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={`rounded-badge border-2 px-3 py-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${current ? 'border-ink bg-ink text-paper' : 'border-transparent text-text-secondary hover:border-ink hover:text-ink'}`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Phone tab bar. `data-tabbar` makes globals.css pad the page bottom
          so it never covers content. */}
      <nav
        data-tabbar
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid grid-cols-4 px-2 pt-2 pb-1.5">
          {LINKS.map(({ href, short, icon: Icon }) => {
            const current = isCurrent(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className="group flex flex-col items-center gap-0.5 rounded-badge py-0.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-card border-2 transition-colors ${current ? 'border-ink bg-ink text-paper' : 'border-transparent text-text-secondary'}`}
                  >
                    <Icon className="size-5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span
                    className={current ? 'text-ink' : 'text-text-secondary'}
                  >
                    {short}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
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
