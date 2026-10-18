'use client';

import type {
  CreateSubmissionRequest,
  SubmissionResult,
  SubmissionSummary,
} from '@loophole/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

// GET /submissions?exerciseId= — the user's latest attempts, newest first.
export function useSubmissions(
  exerciseId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['submissions', exerciseId],
    queryFn: () =>
      apiFetch<SubmissionSummary[]>(`/submissions?exerciseId=${exerciseId}`),
    enabled: enabled && !!exerciseId,
  });
}

// POST /submissions. The server grades; we only refresh what it changed.
export function useSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubmissionRequest) =>
      apiFetch<SubmissionResult>('/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (result, { exerciseId }) => {
      void queryClient.invalidateQueries({
        queryKey: ['submissions', exerciseId],
      });
      if (result.lessonCompleted) {
        // The path (next node unlocked) and /me (lessons, XP, streak) changed.
        void queryClient.invalidateQueries({ queryKey: ['course-path'] });
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      }
      if (result.xpAwarded > 0) {
        void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      }
    },
  });
}
