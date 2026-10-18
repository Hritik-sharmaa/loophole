'use client';

import type {
  ExplainRequest,
  ExplainResponse,
  HintRequest,
  HintResponse,
} from '@loophole/shared';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../api';

// POST /ai/explain: why a submission failed. Only its id is sent.
export function useExplain() {
  return useMutation({
    mutationFn: (body: ExplainRequest) =>
      apiFetch<ExplainResponse>('/ai/explain', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

// POST /ai/hint: one nudge for the code in the editor.
export function useHint() {
  return useMutation({
    mutationFn: (body: HintRequest) =>
      apiFetch<HintResponse>('/ai/hint', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
