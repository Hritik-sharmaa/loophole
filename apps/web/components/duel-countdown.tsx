'use client';

import { useEffect, useState } from 'react';

// Counts down to the server's endsAt (FR-19): the server's clock decides
// when time is up; this only shows how long is left.
export function DuelCountdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const left = Math.max(0, Math.ceil((end - now) / 1000));
  const minutes = Math.floor(left / 60);
  const seconds = String(left % 60).padStart(2, '0');

  return (
    <span
      role="timer"
      aria-label={`${minutes} minutes ${seconds} seconds left`}
      className="font-display text-3xl font-semibold text-sun tabular-nums"
    >
      {left === 0 ? "Time's up" : `${minutes}:${seconds}`}
    </span>
  );
}
