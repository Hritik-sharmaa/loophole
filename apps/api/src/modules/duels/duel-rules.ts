import { ConflictException } from '@nestjs/common';
import type {
  DuelLanguage,
  DuelResultKind,
  DuelStatus,
} from '@loophole/shared';

// ADR-040: one duel pool per language (content/duels/<language>/).
export const DUEL_LANGUAGES: readonly DuelLanguage[] = ['python', 'javascript'];

// ADR-012: duels last 5 minutes.
export const DUEL_DURATION_MS = 5 * 60 * 1000;
// docs/API_SPEC.md: duel submissions are throttled to 1 every 3 s per player.
export const SUBMIT_INTERVAL_MS = 3_000;
// NFR-07: at most 20 duels running at once (v1).
export const MAX_ACTIVE_DUELS = 20;
// FR-23: a player gone this long mid-duel forfeits; back sooner, it resumes.
export const DISCONNECT_FORFEIT_MS = 30_000;
// How often the queue is re-checked while rating bands widen (FR-18).
export const REMATCH_INTERVAL_MS = 5_000;
// The same two players' next duels within a day of their last are unrated.
export const REMATCH_UNRATED_MS = 24 * 60 * 60 * 1000;
// Open duel sockets (tabs) per user; one more is refused at connect.
export const MAX_SOCKETS_PER_USER = 5;

// 'waiting' is the in-memory queue; the rest are duels.status (FR-25).
export type DuelPhase = 'waiting' | DuelStatus;

const NEXT: Record<DuelPhase, readonly DuelPhase[]> = {
  waiting: ['matched'],
  matched: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
};

// FR-25: waiting → matched → in_progress → completed, nothing else.
export function canTransition(from: DuelPhase, to: DuelPhase): boolean {
  return NEXT[from].includes(to);
}

// Throws 409 ILLEGAL_TRANSITION (docs/API_SPEC.md) for anything else.
export function assertTransition(from: DuelPhase, to: DuelPhase): void {
  if (!canTransition(from, to)) {
    throw new ConflictException({
      code: 'ILLEGAL_TRANSITION',
      message:
        from === 'completed'
          ? 'This duel is already over.'
          : `A duel cannot go from ${from} to ${to}.`,
    });
  }
}

export type DuelOutcome = {
  result: Extract<DuelResultKind, 'win' | 'draw'>;
  winnerId: string | null;
};

// FR-22: when time runs out, most tests passed wins; equal is a draw.
// best* is each player's best submission (0 if they never submitted).
export function timeoutOutcome(
  playerA: { id: string; best: number },
  playerB: { id: string; best: number },
): DuelOutcome {
  if (playerA.best === playerB.best) return { result: 'draw', winnerId: null };
  const winner = playerA.best > playerB.best ? playerA : playerB;
  return { result: 'win', winnerId: winner.id };
}
