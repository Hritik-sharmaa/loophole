import { createBrowserClient } from '@supabase/ssr';

// The one Supabase client in the browser. Used only for sign-in, sign-out and
// reading the session token; all app data comes from the API (lib/api.ts).
// It also finishes the Google redirect (PKCE) when the page loads with ?code=.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
