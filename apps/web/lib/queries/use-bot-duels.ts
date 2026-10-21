'use client';

import type {
  BotDuel,
  BotDuelSubmission,
  BotDuelSubmitRequest,
  StartBotDuelRequest,
} from '@loophole/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

// Practice duels against a guide bot (ADR-039).

const key = (id: string) => ['bot-duel', id];

// GET /bot-duels/:id. The server marks the race lost once the bot is done,
// so the page refetches it when the bot's schedule says it finished.
export function useBotDuel(id: string, enabled: boolean) {
  return useQuery({
    queryKey: key(id),
    queryFn: () => apiFetch<BotDuel>(`/bot-duels/${id}`),
    enabled,
  });
}

// POST /bot-duels: a new race with a fresh problem.
export function useStartBotDuel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartBotDuelRequest) =>
      apiFetch<BotDuel>('/bot-duels', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (duel) => queryClient.setQueryData(key(duel.id), duel),
  });
}

// POST /bot-duels/:id/submissions. The response carries the race after
// the attempt, so the page shows a win at once.
export function useSubmitBotDuel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BotDuelSubmitRequest) =>
      apiFetch<BotDuelSubmission>(`/bot-duels/${id}/submissions`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => queryClient.setQueryData(key(id), result.duel),
    // 409: the race ended meanwhile (the bot finished); show how.
    onError: () => void queryClient.invalidateQueries({ queryKey: key(id) }),
  });
}

// POST /bot-duels/:id/forfeit
export function useForfeitBotDuel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<BotDuel>(`/bot-duels/${id}/forfeit`, { method: 'POST' }),
    onSuccess: (duel) => queryClient.setQueryData(key(id), duel),
    onError: () => void queryClient.invalidateQueries({ queryKey: key(id) }),
  });
}
