'use client';

import { io, type Socket } from 'socket.io-client';
import { supabase } from './supabase';

// The one way the web app opens the duel socket (docs/API_SPEC.md, /duels).
// Like apiFetch, it sends the Supabase access token, fetched fresh on every
// (re)connect so an hour-old token is never reused.
export function connectDuels(): Socket {
  return io(`${process.env.NEXT_PUBLIC_API_URL}/duels`, {
    auth: (send) => {
      void supabase.auth.getSession().then(({ data }) => {
        send({ token: data.session?.access_token ?? '' });
      });
    },
    // WebSockets only: no long-polling fallback to keep in step behind Caddy.
    transports: ['websocket'],
  });
}
