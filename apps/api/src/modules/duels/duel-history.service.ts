import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DuelHistoryEntry,
  DuelLanguage,
  DuelReplay,
} from '@loophole/shared';
import { and, desc, eq, inArray, max, or, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import {
  duelProblems,
  duelSubmissions,
  duels,
  profiles,
} from '../../db/schema/index.js';
import { outcomeFor, replayEvents } from './duel-replay.js';

// How many finished duels GET /duels/history lists.
const HISTORY_SIZE = 20;

// A problem's test count, without selecting its hidden tests.
const totalTests = sql<number>`cast(jsonb_array_length(${duelProblems.sampleTests}) + jsonb_array_length(${duelProblems.hiddenTests}) as int)`;

// Duel replays (FR-27, ADR-041): finished duels, read back from duels and
// duel_submissions. Only the players can see a duel, only once it is over,
// and never the opponent's code (hard rule 2).
@Injectable()
export class DuelHistoryService {
  constructor(private readonly db: DbService) {}

  // GET /duels/history
  async history(userId: string): Promise<DuelHistoryEntry[]> {
    const rows = await this.db.drizzle
      .select({
        id: duels.id,
        playerA: duels.playerA,
        playerB: duels.playerB,
        result: duels.result,
        winnerId: duels.winnerId,
        endedAt: duels.endedAt,
        title: duelProblems.title,
        language: duelProblems.language,
        totalTests,
      })
      .from(duels)
      .innerJoin(duelProblems, eq(duels.problemId, duelProblems.id))
      .where(
        and(
          eq(duels.status, 'completed'),
          or(eq(duels.playerA, userId), eq(duels.playerB, userId)),
        ),
      )
      .orderBy(desc(duels.endedAt))
      .limit(HISTORY_SIZE);
    if (rows.length === 0) return [];

    const opponentOf = (r: (typeof rows)[number]) =>
      r.playerA === userId ? r.playerB : r.playerA;
    const names = await this.usernames(rows.map(opponentOf));
    const bests = await this.db.drizzle
      .select({
        duelId: duelSubmissions.duelId,
        userId: duelSubmissions.userId,
        best: max(duelSubmissions.testsPassed),
      })
      .from(duelSubmissions)
      .where(
        inArray(
          duelSubmissions.duelId,
          rows.map((r) => r.id),
        ),
      )
      .groupBy(duelSubmissions.duelId, duelSubmissions.userId);
    const bestOf = (duelId: string, who: string) =>
      bests.find((b) => b.duelId === duelId && b.userId === who)?.best ?? 0;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      language: r.language as DuelLanguage,
      opponent: names.get(opponentOf(r)) ?? 'opponent',
      outcome: outcomeFor(r, userId),
      // A completed duel always has a result.
      result: r.result ?? 'draw',
      endedAt: (r.endedAt ?? new Date()).toISOString(),
      myBest: bestOf(r.id, userId),
      opponentBest: bestOf(r.id, opponentOf(r)),
      totalTests: r.totalTests,
    }));
  }

  // GET /duels/:id/replay
  async replay(userId: string, duelId: string): Promise<DuelReplay> {
    const [row] = await this.db.drizzle
      .select({
        duel: duels,
        title: duelProblems.title,
        language: duelProblems.language,
        description: duelProblems.description,
        buggyCode: duelProblems.buggyCode,
        sampleTests: duelProblems.sampleTests,
        totalTests,
      })
      .from(duels)
      .innerJoin(duelProblems, eq(duels.problemId, duelProblems.id))
      .where(eq(duels.id, duelId));
    // Someone else's duel is "not found", like a missing one.
    if (!row || (row.duel.playerA !== userId && row.duel.playerB !== userId)) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Duel not found.',
      });
    }
    const { duel } = row;
    if (duel.status !== 'completed' || !duel.startedAt || !duel.endedAt) {
      throw new ConflictException({
        code: 'ILLEGAL_TRANSITION',
        message: 'This duel is not over yet.',
      });
    }

    const opponentId = duel.playerA === userId ? duel.playerB : duel.playerA;
    const names = await this.usernames([opponentId]);
    const attempts = await this.db.drizzle
      .select({
        userId: duelSubmissions.userId,
        code: duelSubmissions.code,
        testsPassed: duelSubmissions.testsPassed,
        totalTests: duelSubmissions.totalTests,
        submittedAt: duelSubmissions.submittedAt,
      })
      .from(duelSubmissions)
      .where(eq(duelSubmissions.duelId, duel.id));
    const durationMs = Math.max(
      0,
      duel.endedAt.getTime() - duel.startedAt.getTime(),
    );

    return {
      id: duel.id,
      problem: {
        title: row.title,
        language: row.language as DuelLanguage,
        description: row.description,
        buggyCode: row.buggyCode,
        sampleTests: row.sampleTests,
      },
      opponent: names.get(opponentId) ?? 'opponent',
      outcome: outcomeFor(duel, userId),
      result: duel.result ?? 'draw',
      durationMs,
      totalTests: row.totalTests,
      events: replayEvents(attempts, userId, duel.startedAt, durationMs),
    };
  }

  private async usernames(ids: string[]): Promise<Map<string, string>> {
    const rows = await this.db.drizzle
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .where(inArray(profiles.id, ids));
    return new Map(rows.map((r) => [r.id, r.username]));
  }
}
