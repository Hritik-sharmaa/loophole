'use client';

import { AppHeader } from '@/components/app-header';
import { AvatarMaker } from '@/components/avatar-maker';
import { useMe } from '@/lib/queries/use-me';
import { useRequireSession } from '@/lib/use-require-session';

// The avatar maker (ADR-046). Visitors without a session go to /login.
export default function AvatarPage() {
  const { loading } = useRequireSession();
  const me = useMe(!loading);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold">
            Make your avatar
          </h1>
          <p className="text-text-secondary">
            It shows on the leaderboards, in your league and to duel rivals.
          </p>
        </header>
        {loading || me.isPending ? (
          <p>Loading…</p>
        ) : me.isError ? (
          <p role="alert">✕ Could not load your profile: {me.error.message}</p>
        ) : (
          <AvatarMaker saved={me.data.avatar} />
        )}
      </main>
    </>
  );
}
