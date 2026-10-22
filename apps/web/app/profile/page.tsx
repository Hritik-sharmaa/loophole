'use client';

import type { DailyGoal, LessonLanguage, MeResponse } from '@loophole/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { GoalPicker, StreakCalendar } from '@/components/daily-goal';
import { LessonLanguagePicker } from '@/components/lesson-language-picker';
import { CrewLineup } from '@/components/guide';
import { secondaryButton } from '@/components/ui/buttons';
import { ApiError } from '@/lib/api';
import { useMyCertificates } from '@/lib/queries/use-certificates';
import { useActivity, useMe, useUpdateMe } from '@/lib/queries/use-me';
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
      <CrewLineup mood="happy" />
      <h1 className="font-display text-3xl font-extrabold break-all">
        Hi, {me.username}
      </h1>
      <dl className="grid w-full grid-cols-2 gap-3 text-center">
        <Stat label="XP" value={me.xp} />
        <Stat
          label="Streak"
          value={me.streak.current}
          note={
            me.streak.freezes > 0
              ? `${me.streak.freezes} freeze${me.streak.freezes === 1 ? '' : 's'} saved`
              : 'Every 7 days earns a freeze'
          }
        />
        <Stat label="Rating" value={me.rating} />
        <Stat label="Lessons done" value={me.lessonsCompleted} />
      </dl>
      <StreakSection goal={me.dailyGoal} />
      <GoalSetting current={me.dailyGoal} />
      <LanguageSetting current={me.lessonLanguage} />
      <Certificates />
      <UsernameForm current={me.username} />
      <LogoutButton />
    </Centered>
  );
}

// The last five weeks, one square a day (ADR-033).
function StreakSection({ goal }: { goal: DailyGoal | null }) {
  const activity = useActivity(true);
  return (
    <section className="flex w-full flex-col gap-2 text-left">
      <h2 className="text-sm font-semibold text-text-secondary">
        Last 5 weeks
      </h2>
      {activity.data ? (
        <StreakCalendar activity={activity.data} goal={goal} />
      ) : activity.isError ? (
        <p role="alert" className="text-sm font-semibold">
          ✕ Could not load your days: {activity.error.message}
        </p>
      ) : (
        <p className="text-sm text-text-secondary">Loading your days…</p>
      )}
    </section>
  );
}

// Change the daily goal picked in the welcome (ADR-033). Saved on tap.
function GoalSetting({ current }: { current: DailyGoal | null }) {
  const update = useUpdateMe();
  return (
    <section className="flex w-full flex-col gap-2 text-left">
      <h2 className="text-sm font-semibold text-text-secondary">Daily goal</h2>
      <GoalPicker
        value={current}
        onPick={(dailyGoal) => update.mutate({ dailyGoal })}
        disabled={update.isPending}
      />
      {update.isError && (
        <p role="alert" className="text-sm font-semibold">
          ✕ {update.error.message}
        </p>
      )}
    </section>
  );
}

// FR-15: one per finished course, each with its public /c/<slug> page.
// The language lessons are shown in (ADR-042). Saved on tap; lessons
// already open reload in the new language.
function LanguageSetting({ current }: { current: LessonLanguage }) {
  const update = useUpdateMe();
  return (
    <section className="flex w-full flex-col gap-2 text-left">
      <h2 className="text-sm font-semibold text-text-secondary">
        Lesson language
      </h2>
      <LessonLanguagePicker
        value={current}
        onPick={(lessonLanguage) => update.mutate({ lessonLanguage })}
        disabled={update.isPending}
      />
      <p className="text-sm text-text-secondary">
        Cards, quick checks, tasks and checklists switch, in every course; code
        stays the same.
      </p>
      {update.isError && (
        <p role="alert" className="text-sm font-semibold">
          ✕ {update.error.message}
        </p>
      )}
    </section>
  );
}

function Certificates() {
  const certs = useMyCertificates(true);
  if (!certs.data || certs.data.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-2 text-left">
      <h2 className="text-sm font-semibold text-text-secondary">
        Certificates
      </h2>
      <ul className="flex flex-col gap-2">
        {certs.data.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/c/${c.slug}`}
              className="flex items-center gap-3 rounded-card border-2 border-ink bg-lemon px-4 py-3 font-bold shadow-sticker-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Award className="size-5 text-ink" aria-hidden />
              {c.courseTitle}
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
          className="min-w-0 flex-1 rounded-card border-2 border-ink bg-paper px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
      className="rounded-badge text-sm font-semibold text-text-secondary underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      Log out
    </button>
  );
}

// note: a line of small print under the number.
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="rounded-card border-2 border-ink bg-paper p-4 shadow-sticker-sm">
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="font-display text-2xl font-extrabold">{value}</dd>
      {note && (
        <dd className="text-xs font-semibold text-text-secondary">{note}</dd>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center sm:px-6 sm:py-16">
      {children}
    </main>
  );
}
