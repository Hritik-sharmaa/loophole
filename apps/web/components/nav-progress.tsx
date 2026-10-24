'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// A thin Violet bar across the top of the window from the moment a link
// to another page is clicked until that page is showing, so a click never
// feels ignored. It runs while the pathname is still the one it started
// on; once the pathname changes it jumps to full width and fades.
export function NavProgress() {
  const pathname = usePathname();
  // The pathname a navigation started from, and a count to restart the
  // bar on every click.
  const [start, setStart] = useState<{ from: string; n: number } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      // Other sites, and links to a spot on this same page, aren't page changes.
      if (url.origin !== location.origin || url.pathname === location.pathname)
        return;
      setStart((s) => ({ from: location.pathname, n: (s?.n ?? 0) + 1 }));
    };
    // Capture phase: <Link> calls preventDefault() on its own clicks, so a
    // normal listener would see every page change as cancelled.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!start) return null;
  const loading = start.from === pathname;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]"
    >
      <span
        key={start.n}
        // A click that never changes the page (cancelled, same page after a
        // redirect) mustn't leave the bar hanging.
        onAnimationEnd={() => setStart(null)}
        className={`block h-full origin-left rounded-r-full bg-violet shadow-[0_0_10px_rgb(106_77_244/0.7)] ${loading ? 'animate-nav-grow' : 'opacity-0 transition-opacity delay-150 duration-300'}`}
      />
    </div>
  );
}
