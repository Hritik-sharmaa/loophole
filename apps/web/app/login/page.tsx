'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Byte } from '@/components/byte';
import { Logo } from '@/components/logo';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { stickerCard } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const INPUT =
  'rounded-card border-2 border-ink bg-paper px-4 py-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const schema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});
type FormValues = z.infer<typeof schema>;

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit({ email, password }: FormValues) {
    setError(null);
    setNotice(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return setError(error.message);
      router.push('/learn');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/learn` },
    });
    if (error) return setError(error.message);
    // With "Confirm email" off in Supabase, sign-up returns a session at once.
    if (data.session) router.push('/learn');
    else setNotice('Check your email to confirm your account, then log in.');
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/learn` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6">
      <Logo href="/" />
      <div className={`${stickerCard} flex flex-col gap-6 px-6 py-8`}>
        <div className="flex items-center gap-4">
          <Byte
            mood={mode === 'login' ? 'happy' : 'idle'}
            className="size-16 shrink-0"
          />
          <h1 className="font-display text-3xl font-extrabold">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Email
            <input
              type="email"
              autoComplete="email"
              className={INPUT}
              {...register('email')}
            />
            {errors.email && (
              <span className="font-medium text-text-secondary">
                {errors.email.message}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Password
            <input
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              className={INPUT}
              {...register('password')}
            />
            {errors.password && (
              <span className="font-medium text-text-secondary">
                {errors.password.message}
              </span>
            )}
          </label>

          {error && (
            <p role="alert" className="text-sm font-semibold">
              ✕ {error}
            </p>
          )}
          {notice && <p className="text-sm font-semibold">{notice}</p>}

          {/* Text on orange is Ink, never white (AGENTS.md rule 8). */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryButton}
          >
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={signInWithGoogle}
          className={secondaryButton}
        >
          Continue with Google
        </button>

        <p className="text-sm text-text-secondary">
          {mode === 'login' ? 'New to Loophole?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="rounded-badge font-bold text-ink underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>

      <Link
        href="/"
        className="self-start rounded-badge text-sm text-text-secondary underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Back home
      </Link>
    </main>
  );
}
