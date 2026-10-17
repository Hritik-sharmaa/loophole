import type { ApiErrorBody } from '@loophole/shared';
import { supabase } from './supabase';

// An error response from the API, with its code from docs/API_SPEC.md.
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// The one way the web app calls the API: attaches the Supabase access token
// and turns error responses into ApiError.
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error.code ?? 'ERROR',
      body?.error.message ?? 'Something went wrong.',
      res.status,
    );
  }
  return (await res.json()) as T;
}
