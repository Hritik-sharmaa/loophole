'use client';

import type { RunRequest, RunResponse } from '@loophole/shared';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../api';

// POST /runs — run a Learn example once. Ungraded: nothing to refresh.
export function useRun() {
  return useMutation({
    mutationFn: (body: RunRequest) =>
      apiFetch<RunResponse>('/runs', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
