'use client';

import type { MeResponse } from '@loophole/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { secondaryButton } from '@/components/ui/buttons';
import { ApiError } from '@/lib/api';
import { useMe, useUpdateMe } from '@/lib/queries/use-me';
import { supabase } from '@/lib/supabase';
import { useRequireSession } from '@/lib/use-require-session';

// The signed-in user's page. Visitors without a session go to /login.
export default function ProfilePage() {
  const { loading } = useRequireSession();
  const me = useMe(!loading);

  return (
    <>
      <AppHeader />
      {loading || me.isPending ? (
        <Centered>Loading…</Centered>
      ) : me.isError ? (
        <Centered>
          <p role="alert">✕ Could not load your profile: {me.error.message}</p>
          <LogoutButton />
        </Centered>
      ) : (
        <Profile me={me.data} />
      )}
    </>
  );
}

function Profile({ me }: { me: MeResponse }) {
  return (
    <Centered>
      <h1 className="font-display text-3xl font-extrabold">
        Hi, {me.username}
      </h1>
      <dl className="grid w-full grid-cols-2 gap-3 text-center">
        <Stat label="XP" value={me.xp} />
        <Stat label="Streak" value={me.streak.current} />
        <Stat label="Rating" value={me.rating} />
        <Stat label="Lessons done" value={me.lessonsCompleted} />
      </dl>
      <UsernameForm current={me.username} />
      <LogoutButton />
    </Centered>
  );
}

function UsernameForm({ current }: { current: string }) {
  const update = useUpdateMe();
  const [username, setUsername] = useState(current);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    update.mutate({ username: username.trim() });
  }

  const error =
    update.error instanceof ApiError && update.error.code === 'USERNAME_TAKEN'
      ? 'That username is taken.'
      : update.error?.message;

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <label
        htmlFor="username"
        className="text-sm font-semibold text-text-secondary"
      >
        Username (3–20 chars: a–z, 0–9, _)
      </label>
      <div className="flex gap-2">
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="min-w-0 flex-1 rounded-card border-2 border-border-muted px-4 py-2 font-medium focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={update.isPending || username === current}
          className={`${secondaryButton} px-4 py-2`}
        >
          Save
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold">
          ✕ {error}
        </p>
      )}
      {update.isSuccess && <p className="text-sm font-semibold">✓ Saved</p>}
    </form>
  );
}

function LogoutButton() {
  const queryClient = useQueryClient();

  async function logOut() {
    await supabase.auth.signOut();
    // Drop the cached profile so the next user never sees it.
    queryClient.clear();
  }

  return (
    <button
      type="button"
      onClick={logOut}
      className="text-sm font-semibold text-text-secondary underline"
    >
      Log out
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card bg-surface p-4">
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="font-display text-2xl font-extrabold">{value}</dd>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      {children}
    </main>
  );
}
