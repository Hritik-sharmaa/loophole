'use client';

import type {
  LeagueResponse,
  RatingLeaderboard,
  WeeklyLeaderboard,
} from '@loophole/shared';
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

// GET /leaderboard/rating — duel Elo, highest first, plus the user's rank.
export function useRatingLeaderboard(enabled: boolean) {
  return useQuery({
    queryKey: ['leaderboard', 'rating'],
    queryFn: () => apiFetch<RatingLeaderboard>('/leaderboard/rating'),
    enabled,
  });
}

// GET /leagues/current — the learner's league group this week (ADR-038).
export function useLeague(enabled: boolean) {
  return useQuery({
    queryKey: ['leaderboard', 'league'],
    queryFn: () => apiFetch<LeagueResponse>('/leagues/current'),
    enabled,
  });
}
