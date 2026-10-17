'use client';

import type { MeResponse, UpdateMeRequest } from '@loophole/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

const ME_KEY = ['me'] as const;

// GET /me. Pass enabled: false while signed out so it never fires without a token.
export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiFetch<MeResponse>('/me'),
    enabled,
  });
}

// PATCH /me. On success, the cached profile is replaced with the response.
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) =>
      apiFetch<MeResponse>('/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (me) => queryClient.setQueryData(ME_KEY, me),
  });
}
