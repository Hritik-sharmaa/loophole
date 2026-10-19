import type { Metadata } from 'next';
import { Byte } from '@/components/byte';
import { Logo } from '@/components/logo';
import { stickerCard } from '@/components/ui/card';
import { RetryButton } from './retry-button';

export const metadata: Metadata = { title: 'Offline · Loophole' };

// What the service worker shows when there is no network and the page
// wasn't cached (public/sw.js, ADR-022). Static, so it can be precached.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center sm:px-6">
      <Logo href="/" />
      <section
        className={`${stickerCard} flex flex-col items-center gap-4 px-6 py-10`}
      >
        <Byte mood="oops" className="size-24" />
        <h1 className="font-display text-3xl font-extrabold">
          You&apos;re offline
        </h1>
        <p className="text-text-secondary">
          Loophole runs and grades your code on its server, so lessons and duels
          need a connection. Reconnect and try again.
        </p>
        <RetryButton />
      </section>
    </main>
  );
}
