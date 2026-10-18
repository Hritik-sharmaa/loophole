'use client';

import type { CertificateSummary, PublicCertificate } from '@loophole/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../api';

// GET /certificates — the signed-in user's own (profile page).
export function useMyCertificates(enabled: boolean) {
  return useQuery({
    queryKey: ['certificates'],
    queryFn: () => apiFetch<CertificateSummary[]>('/certificates'),
    enabled,
  });
}

// GET /certificates/:slug — public; works with or without a session.
export function usePublicCertificate(slug: string) {
  return useQuery({
    queryKey: ['certificate', slug],
    queryFn: () => apiFetch<PublicCertificate>(`/certificates/${slug}`),
    // A missing certificate won't appear on retry.
    retry: (failures, error) =>
      !(error instanceof ApiError && error.status < 500) && failures < 1,
  });
}
