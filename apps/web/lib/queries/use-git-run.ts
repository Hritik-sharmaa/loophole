'use client';

import type { GitRunRequest, GitRunResponse } from '@loophole/shared';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../api';

// POST /git/run — replay a git lesson's terminal (ADR-026). Ungraded and
// stateless: the server replays every command each time.
export function useGitRun() {
  return useMutation({
    mutationFn: (body: GitRunRequest) =>
      apiFetch<GitRunResponse>('/git/run', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
