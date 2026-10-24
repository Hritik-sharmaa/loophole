'use client';

import {
  BookOpen,
  Swords,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { GoalRing } from '@/components/daily-goal';
import { Logo } from '@/components/logo';
import { CoinSticker, FlameSticker } from '@/components/stickers';
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
    pathname === href ||
    (href === '/learn' &&
      (pathname.startsWith('/learn/') || pathname.startsWith('/lessons')));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border-muted bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/learn" size="sm" />

          {/* StreakBadge / XpBadge (DESIGN_SYSTEM §6). On phones they sit
              here; from md up beside the links; at sm the row is too
              narrow for both, and the profile page shows the numbers. */}
          {me.data && (
            <div className="flex items-center gap-2 sm:hidden md:flex">
              {/* The daily goal (ADR-033): a ring that fills as XP comes in. */}
              {me.data.dailyGoal !== null && (
                <span
                  title={`Daily goal: ${me.data.todayXp} of ${me.data.dailyGoal} XP today`}
                  className={`${chip} bg-paper text-ink tabular-nums`}
                >
                  <GoalRing
                    value={me.data.todayXp}
                    goal={me.data.dailyGoal}
                    className="size-4"
                  />
                  <span aria-hidden>
                    {Math.min(me.data.todayXp, me.data.dailyGoal)}/
                    {me.data.dailyGoal}
                  </span>
                  <span className="sr-only">
                    Daily goal: {me.data.todayXp} of {me.data.dailyGoal} XP
                    today
                  </span>
                </span>
              )}
              <Badge
                icon={<FlameSticker className="size-4" />}
                label={`${me.data.streak.current} day streak${me.data.streak.freezes > 0 ? `, ${me.data.streak.freezes} freeze${me.data.streak.freezes === 1 ? '' : 's'} saved` : ''}`}
                value={me.data.streak.current}
              />
              <Badge
                icon={<CoinSticker className="size-4" />}
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
                    className={`relative isolate block rounded-badge px-3.5 py-1.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet ${current ? 'text-violet' : 'text-text-secondary hover:text-ink'}`}
                  >
                    {/* The pill slides from the old link to the new one. */}
                    {current && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-badge bg-violet-tint"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
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
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 rounded-[1.75rem] border border-border-muted bg-paper/95 shadow-[0_16px_30px_-18px_rgb(60_30_120/0.55)] backdrop-blur-md sm:hidden"
      >
        <ul className="grid grid-cols-4 px-2 py-1.5">
          {LINKS.map(({ href, short, icon: Icon }) => {
            const current = isCurrent(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className="group flex flex-col items-center gap-0.5 rounded-badge py-0.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
                >
                  <span
                    className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-colors ${current ? 'text-violet' : 'text-text-tertiary'}`}
                  >
                    {current && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-2xl bg-violet-tint"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <Icon
                      className="relative size-5"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={current ? 'text-violet' : 'text-text-secondary'}
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

// A white reward chip with a glossy sticker (coin for XP, flame for the streak).
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
    <span title={label} className={`${chip} bg-paper py-1 text-ink`}>
      <span className="-my-1" aria-hidden>
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
