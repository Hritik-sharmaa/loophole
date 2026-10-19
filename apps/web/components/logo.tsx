import Link from 'next/link';
import { Byte } from '@/components/byte';

// The Loophole logo (docs/DESIGN_SYSTEM.md §9): Byte's head as the mark,
// then the wordmark in the display face.
export function Logo({
  href,
  size = 'md',
}: {
  href: string;
  size?: 'sm' | 'md';
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Byte variant="mark" className={size === 'sm' ? 'size-6' : 'size-8'} />
      <span
        className={`font-display font-extrabold tracking-tight ${size === 'sm' ? 'text-lg' : 'text-2xl'}`}
      >
        loophole
      </span>
    </Link>
  );
}
