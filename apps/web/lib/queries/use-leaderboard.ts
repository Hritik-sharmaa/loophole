'use client';

import type { WeeklyLeaderboard } from '@loophole/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';

// GET /leaderboard/weekly — top 50 this week plus the user's own rank.
export function useWeeklyLeaderboard(enabled: boolean) {
  return useQuery({
    queryKey: ['leaderboard', 'weekly'],
    queryFn: () => apiFetch<WeeklyLeaderboard>('/leaderboard/weekly'),
    enabled,
  });
}
