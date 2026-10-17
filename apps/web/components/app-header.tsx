'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/learn', label: 'Learn' },
  { href: '/profile', label: 'Profile' },
];

// Top bar for the signed-in pages.
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-surface bg-paper">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <Link
          href="/learn"
          className="font-display text-2xl font-extrabold tracking-tight"
        >
          loop<span className="text-orange">hole</span>
        </Link>
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
