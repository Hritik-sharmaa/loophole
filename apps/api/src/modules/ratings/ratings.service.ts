import { Injectable } from '@nestjs/common';
import type { RatingLeaderboard } from '@loophole/shared';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { DbService, type Db } from '../../db/db.service.js';
import { profiles, ratings } from '../../db/schema/index.js';
import { STARTING_ELO, eloChanges } from './elo.js';

// The database handle applyDuel runs on: the caller's transaction.
type Tx = Pick<Db, 'select' | 'insert' | 'update'>;

@Injectable()
export class RatingsService {
  constructor(private readonly db: DbService) {}

  // FR-24: Elo for both players after one duel. scoreA is 1 if A won, 0 if
  // A lost, 0.5 for a draw. Runs inside the transaction that marks the duel
  // completed (DuelsService.finish): both ratings and the result commit
  // together or not at all, so a duel can never pay twice or be lost.
  async applyDuel(
    tx: Tx,
    playerA: string,
    playerB: string,
    scoreA: 0 | 0.5 | 1,
  ): Promise<Record<string, number>> {
    await tx
      .insert(ratings)
      .values([{ userId: playerA }, { userId: playerB }])
      .onConflictDoNothing();
    // Lock both rows for this read-then-write. Always in id order, so two
    // duels finishing at once for the same player can't deadlock.
    const rows = await tx
      .select({ userId: ratings.userId, elo: ratings.elo })
      .from(ratings)
      .where(inArray(ratings.userId, [playerA, playerB]))
      .orderBy(asc(ratings.userId))
      .for('update');
    const eloOf = (id: string) =>
      rows.find((r) => r.userId === id)?.elo ?? STARTING_ELO;

    const change = eloChanges(eloOf(playerA), eloOf(playerB), scoreA);
    await this.record(tx, playerA, change.a, scoreA);
    await this.record(tx, playerB, change.b, (1 - scoreA) as 0 | 0.5 | 1);
    return { [playerA]: change.a, [playerB]: change.b };
  }

  // Current Elo per user; STARTING_ELO for anyone without a finished duel.
  async elosOf(userIds: string[]): Promise<Map<string, number>> {
    const rows = await this.db.drizzle
      .select({ userId: ratings.userId, elo: ratings.elo })
      .from(ratings)
      .where(inArray(ratings.userId, userIds));
    return new Map(
      userIds.map((id) => [
        id,
        rows.find((r) => r.userId === id)?.elo ?? STARTING_ELO,
      ]),
    );
  }

  // GET /leaderboard/rating (FR-24). Equal Elo shares a rank (1, 1, 3).
  async leaderboard(userId: string, limit: number): Promise<RatingLeaderboard> {
    const board = this.db.drizzle.$with('board').as(
      this.db.drizzle
        .select({
          userId: ratings.userId,
          elo: ratings.elo,
          rank: sql<number>`cast(rank() over (order by ${ratings.elo} desc) as int)`.as(
            'rank',
          ),
        })
        .from(ratings),
    );

    const entries = await this.db.drizzle
      .with(board)
      .select({
        rank: board.rank,
        userId: board.userId,
        username: profiles.username,
        elo: board.elo,
      })
      .from(board)
      .innerJoin(profiles, eq(profiles.id, board.userId))
      .orderBy(asc(board.rank), asc(profiles.username))
      .limit(limit);

    const [me] = await this.db.drizzle
      .with(board)
      .select({ rank: board.rank, elo: board.elo })
      .from(board)
      .where(eq(board.userId, userId));

    return { entries, me: me ?? { rank: null, elo: STARTING_ELO } };
  }

  private async record(
    tx: Tx,
    userId: string,
    delta: number,
    score: 0 | 0.5 | 1,
  ): Promise<void> {
    await tx
      .update(ratings)
      .set({
        elo: sql`${ratings.elo} + ${delta}`,
        wins: sql`${ratings.wins} + ${score === 1 ? 1 : 0}`,
        losses: sql`${ratings.losses} + ${score === 0 ? 1 : 0}`,
        draws: sql`${ratings.draws} + ${score === 0.5 ? 1 : 0}`,
        updatedAt: new Date(),
      })
      .where(eq(ratings.userId, userId));
  }
}
