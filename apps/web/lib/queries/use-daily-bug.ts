'use client';

import type {
  DailyBugBoard,
  DailyBugResult,
  DailyBugSubmitRequest,
  DailyBugToday,
} from '@loophole/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

// Bug of the day (FR-28, ADR-035).

// GET /bug-of-the-day. Its first call of the day starts the learner's
// clock, so only the bug's own page uses it; the board doesn't.
export function useDailyBug(enabled: boolean) {
  return useQuery({
    queryKey: ['daily-bug'],
    queryFn: () => apiFetch<DailyBugToday>('/bug-of-the-day'),
    enabled,
  });
}

// GET /bug-of-the-day/board: safe anywhere (the home card, the bug page).
export function useDailyBugBoard(enabled: boolean) {
  return useQuery({
    queryKey: ['daily-bug-board'],
    queryFn: () => apiFetch<DailyBugBoard>('/bug-of-the-day/board'),
    enabled,
  });
}

// POST /bug-of-the-day/submissions. The server grades and times it.
export function useSubmitDailyBug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DailyBugSubmitRequest) =>
      apiFetch<DailyBugResult>('/bug-of-the-day/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      if (!result.solved) return;
      void queryClient.invalidateQueries({ queryKey: ['daily-bug'] });
      void queryClient.invalidateQueries({ queryKey: ['daily-bug-board'] });
      if (result.xpAwarded > 0) {
        // XP, today's goal, the calendar and the weekly board moved.
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
        void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      }
    },
  });
}
