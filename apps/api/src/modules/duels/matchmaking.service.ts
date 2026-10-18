import { Injectable } from '@nestjs/common';

export type WaitingPlayer = { userId: string; socketId: string };

// The duel queue, in memory (ADR-010): one API instance, so a restart only
// drops people who were waiting. S7 pairs the first two in line (FR-17);
// rating bands come in Phase 3 (FR-18).
@Injectable()
export class MatchmakingService {
  private readonly queue: WaitingPlayer[] = [];

  // Adds the player (once, however many tabs they open) and returns their
  // 1-based place in line.
  join(userId: string, socketId: string): number {
    const index = this.queue.findIndex((p) => p.userId === userId);
    if (index >= 0) {
      this.queue[index].socketId = socketId;
      return index + 1;
    }
    this.queue.push({ userId, socketId });
    return this.queue.length;
  }

  leave(userId: string): void {
    this.removeWhere((p) => p.userId === userId);
  }

  // A closed tab stops waiting.
  leaveSocket(socketId: string): void {
    this.removeWhere((p) => p.socketId === socketId);
  }

  // The first two in line, removed from the queue; null if fewer wait.
  takePair(): [WaitingPlayer, WaitingPlayer] | null {
    if (this.queue.length < 2) return null;
    const [a, b] = this.queue.splice(0, 2);
    return [a, b];
  }

  private removeWhere(match: (p: WaitingPlayer) => boolean): void {
    const index = this.queue.findIndex(match);
    if (index >= 0) this.queue.splice(index, 1);
  }
}
