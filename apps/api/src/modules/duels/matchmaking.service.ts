import { Injectable } from '@nestjs/common';
import type { DuelLanguage } from '@loophole/shared';

export type WaitingPlayer = {
  userId: string;
  socketId: string;
  elo: number;
  // The pool they want a problem from; only the same language pairs.
  language: DuelLanguage;
  // When they joined (ms since epoch); their band widens from here.
  joinedAt: number;
};

// FR-18: start by accepting opponents within ±150 Elo, widening by 100
// every 15 s of waiting.
export const BASE_BAND = 150;
export const BAND_STEP = 100;
export const BAND_STEP_MS = 15_000;

// How far from their own Elo a player waiting since `joinedAt` will accept.
export function ratingBand(joinedAt: number, now: number): number {
  const steps = Math.floor(Math.max(0, now - joinedAt) / BAND_STEP_MS);
  return BASE_BAND + steps * BAND_STEP;
}

// The duel queue, in memory (ADR-010): one API instance, so a restart only
// drops people who were waiting. Pairs by language (ADR-040), then by
// rating band (FR-18).
@Injectable()
export class MatchmakingService {
  private readonly queue: WaitingPlayer[] = [];

  // Adds the player (once, however many tabs they open: a second tab keeps
  // their place and waiting time, and may switch language) and returns
  // their 1-based place among those waiting for the same language.
  join(
    userId: string,
    socketId: string,
    elo: number,
    now = Date.now(),
    language: DuelLanguage = 'python',
  ): number {
    const waiting = this.queue.find((p) => p.userId === userId);
    if (waiting) {
      waiting.socketId = socketId;
      waiting.language = language;
    } else {
      this.queue.push({ userId, socketId, elo, language, joinedAt: now });
    }
    const line = this.queue.filter((p) => p.language === language);
    return line.findIndex((p) => p.userId === userId) + 1;
  }

  leave(userId: string): void {
    this.removeWhere((p) => p.userId === userId);
  }

  // A closed tab stops waiting.
  leaveSocket(socketId: string): void {
    this.removeWhere((p) => p.socketId === socketId);
  }

  // The first compatible pair, removed from the queue; null if none. The
  // longest-waiting player is served first, and a pair fits when they want
  // the same language and their Elo gap is within the wider of the two
  // bands (the one waiting longer).
  takePair(now = Date.now()): [WaitingPlayer, WaitingPlayer] | null {
    for (let i = 0; i < this.queue.length; i++) {
      const a = this.queue[i];
      for (let j = i + 1; j < this.queue.length; j++) {
        const b = this.queue[j];
        if (a.language !== b.language) continue;
        const band = Math.max(
          ratingBand(a.joinedAt, now),
          ratingBand(b.joinedAt, now),
        );
        if (Math.abs(a.elo - b.elo) <= band) {
          this.queue.splice(j, 1);
          this.queue.splice(i, 1);
          return [a, b];
        }
      }
    }
    return null;
  }

  private removeWhere(match: (p: WaitingPlayer) => boolean): void {
    const index = this.queue.findIndex(match);
    if (index >= 0) this.queue.splice(index, 1);
  }
}
