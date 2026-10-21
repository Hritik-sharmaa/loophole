'use client';

import type { DuelHistoryEntry, DuelReplay } from '@loophole/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';

// Finished duels and their replays (FR-27, ADR-041). A finished duel never
// changes, so a replay is cached for the session.

export function useDuelHistory(enabled: boolean) {
  return useQuery({
    queryKey: ['duel-history'],
    queryFn: () => apiFetch<DuelHistoryEntry[]>('/duels/history'),
    enabled,
  });
}

export function useDuelReplay(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['duel-replay', id],
    queryFn: () => apiFetch<DuelReplay>(`/duels/${id}/replay`),
    enabled,
    staleTime: Infinity,
  });
}
