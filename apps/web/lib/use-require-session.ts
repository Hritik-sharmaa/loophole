'use client';

import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from './use-session';

// For signed-in pages: sends visitors without a session to /login.
// `session` is null while loading or while the redirect happens.
export function useRequireSession(): {
  session: Session | null;
  loading: boolean;
} {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  return { session, loading: loading || !session };
}
