import { Injectable } from '@nestjs/common';
import type { MeResponse, WeeklyLeaderboard } from '@loophole/shared';
import { asc, eq, gte, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import { profiles, streaks, xpEvents } from '../../db/schema/index.js';
import { istDate, istWeekStart } from '../../common/ist-calendar.js';
import {
  NO_STREAK,
  nextStreak,
  visibleStreak,
  type StreakState,
} from './streak.js';

// ADR-012: 10 XP per lesson.
export const LESSON_XP = 10;

@Injectable()
export class GamificationService {
  constructor(private readonly db: DbService) {}

  // Pays a lesson's XP and counts today toward the streak, once per lesson
  // per user (FR-09, NFR-12). Safe to call on every passing submission: the
  // xp_events unique constraint turns a repeat into a no-op that returns 0.
  // Only a new completion moves the streak (developer's choice for S4).
  async awardLesson(
    userId: string,
    lessonId: string,
    now = new Date(),
  ): Promise<number> {
    return this.db.drizzle.transaction(async (tx) => {
      const [paid] = await tx
        .insert(xpEvents)
        .values({
          userId,
          amount: LESSON_XP,
          source: 'lesson',
          sourceId: lessonId,
          // From the app clock, so the week it lands in matches istWeekStart.
          createdAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: xpEvents.id });
      if (!paid) return 0;

      const prev = await this.streakState(userId, tx);
      const next = nextStreak(prev, istDate(now));
      const values = {
        currentStreak: next.current,
        longestStreak: next.longest,
        lastActiveDate: next.lastActiveDate,
        freezesAvailable: next.freezes,
      };
      await tx
        .insert(streaks)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: streaks.userId, set: values });
      return LESSON_XP;
    });
  }

  // Total XP and the streak as GET /me shows it.
  async stats(
    userId: string,
    now = new Date(),
  ): Promise<Pick<MeResponse, 'xp' | 'streak'>> {
    const [{ xp }] = await this.db.drizzle
      .select({
        xp: sql<number>`cast(coalesce(sum(${xpEvents.amount}), 0) as int)`,
      })
      .from(xpEvents)
      .where(eq(xpEvents.userId, userId));
    const state = await this.streakState(userId);

    return {
      xp,
      streak: {
        current: visibleStreak(state, istDate(now)),
        longest: state.longest,
        freezes: state.freezes,
      },
    };
  }

  // FR-11: XP earned since Monday 00:00 IST, top `limit`, plus the caller.
  async weekly(
    userId: string,
    limit: number,
    now = new Date(),
  ): Promise<WeeklyLeaderboard> {
    const weekStart = istWeekStart(now);
    const total = sql`sum(${xpEvents.amount})`;
    const board = this.db.drizzle.$with('board').as(
      this.db.drizzle
        .select({
          userId: xpEvents.userId,
          xp: sql<number>`cast(${total} as int)`.as('xp'),
          // rank(): equal XP shares a place, then the next one is skipped.
          rank: sql<number>`cast(rank() over (order by ${total} desc) as int)`.as(
            'rank',
          ),
        })
        .from(xpEvents)
        .where(gte(xpEvents.createdAt, weekStart))
        .groupBy(xpEvents.userId),
    );

    const entries = await this.db.drizzle
      .with(board)
      .select({
        rank: board.rank,
        userId: board.userId,
        username: profiles.username,
        xp: board.xp,
      })
      .from(board)
      .innerJoin(profiles, eq(profiles.id, board.userId))
      .orderBy(asc(board.rank), asc(profiles.username))
      .limit(limit);

    const [me] = await this.db.drizzle
      .with(board)
      .select({ rank: board.rank, xp: board.xp })
      .from(board)
      .where(eq(board.userId, userId));

    return {
      weekStart: weekStart.toISOString(),
      entries,
      me: me ?? { rank: null, xp: 0 },
    };
  }

  // `tx` lets awardLesson read inside its transaction.
  private async streakState(
    userId: string,
    tx: Pick<DbService['drizzle'], 'select'> = this.db.drizzle,
  ): Promise<StreakState> {
    const [row] = await tx
      .select({
        current: streaks.currentStreak,
        longest: streaks.longestStreak,
        lastActiveDate: streaks.lastActiveDate,
        freezes: streaks.freezesAvailable,
      })
      .from(streaks)
      .where(eq(streaks.userId, userId));
    return row ?? NO_STREAK;
  }
}
