import { Injectable } from '@nestjs/common';
import type {
  ActivityResponse,
  MeResponse,
  WeeklyLeaderboard,
} from '@loophole/shared';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import { LeaguesService } from '../leagues/leagues.service.js';
import { lessons, profiles, streaks, xpEvents } from '../../db/schema/index.js';
import {
  addDays,
  istDate,
  istDayStart,
  istWeekStart,
} from '../../common/ist-calendar.js';
import {
  NO_STREAK,
  nextStreak,
  visibleStreak,
  type StreakState,
} from './streak.js';

// ADR-012: 10 XP per lesson.
export const LESSON_XP = 10;

// ADR-043: a unit's checkpoint project is worth three lessons.
export const PROJECT_XP = 30;

// ADR-035: the bug of the day pays like two lessons. A duel problem hides
// one to three bugs in a whole program, so it takes longer than a lesson,
// and it comes only once a day.
export const DAILY_BUG_XP = 20;

@Injectable()
export class GamificationService {
  constructor(
    private readonly db: DbService,
    private readonly leagues: LeaguesService,
  ) {}

  // Pays a lesson's XP and counts today toward the streak, once per lesson
  // per user (FR-09, NFR-12). Safe to call on every passing submission: the
  // xp_events unique constraint turns a repeat into a no-op that returns 0.
  // Only a new completion moves the streak (developer's choice for S4).
  async awardLesson(
    userId: string,
    lessonId: string,
    now = new Date(),
  ): Promise<number> {
    const [lesson] = await this.db.drizzle
      .select({ isProject: lessons.isProject })
      .from(lessons)
      .where(eq(lessons.id, lessonId));
    const amount = lesson?.isProject ? PROJECT_XP : LESSON_XP;
    const paid = await this.db.drizzle.transaction(async (tx) => {
      const [paid] = await tx
        .insert(xpEvents)
        .values({
          userId,
          amount,
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
      return amount;
    });
    // The week's first XP puts the learner in a league group (ADR-038).
    if (paid > 0) await this.leagues.join(userId, now);
    return paid;
  }

  // Pays the bug of the day's XP (ADR-035), once per play: the xp_events
  // unique constraint turns a repeat into a no-op that returns 0. It counts
  // toward the weekly board and the daily goal, but not the streak, which
  // stays "one new lesson a day" (FR-10).
  async awardDailyBug(
    userId: string,
    playId: string,
    now = new Date(),
  ): Promise<number> {
    const [paid] = await this.db.drizzle
      .insert(xpEvents)
      .values({
        userId,
        amount: DAILY_BUG_XP,
        source: 'daily-bug',
        sourceId: playId,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: xpEvents.id });
    if (!paid) return 0;
    await this.leagues.join(userId, now);
    return DAILY_BUG_XP;
  }

  // Total XP and the streak as GET /me shows it.
  async stats(
    userId: string,
    now = new Date(),
  ): Promise<Pick<MeResponse, 'xp' | 'streak' | 'todayXp'>> {
    const [{ xp, todayXp }] = await this.db.drizzle
      .select({
        xp: sql<number>`cast(coalesce(sum(${xpEvents.amount}), 0) as int)`,
        // The daily goal's progress (ADR-033): XP since 00:00 IST.
        todayXp: sql<number>`cast(coalesce(sum(${xpEvents.amount}) filter (where ${xpEvents.createdAt} >= ${istDayStart(now).toISOString()}::timestamptz), 0) as int)`,
      })
      .from(xpEvents)
      .where(eq(xpEvents.userId, userId));
    const state = await this.streakState(userId);

    return {
      xp,
      todayXp,
      streak: {
        current: visibleStreak(state, istDate(now)),
        longest: state.longest,
        freezes: state.freezes,
      },
    };
  }

  // GET /me/activity (ADR-033): XP per IST day over five weeks, Monday
  // four weeks ago through today, for the profile's streak calendar.
  // Bucketed here rather than in SQL so the day boundary is the same IST
  // rule as everywhere else.
  async activity(userId: string, now = new Date()): Promise<ActivityResponse> {
    const today = istDate(now);
    const from = addDays(istDate(istWeekStart(now)), -28);
    const rows = await this.db.drizzle
      .select({ amount: xpEvents.amount, createdAt: xpEvents.createdAt })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, userId),
          gte(xpEvents.createdAt, new Date(`${from}T00:00:00+05:30`)),
        ),
      );
    const byDay = new Map<string, number>();
    for (const { amount, createdAt } of rows) {
      const day = istDate(createdAt);
      byDay.set(day, (byDay.get(day) ?? 0) + amount);
    }
    return {
      from,
      today,
      days: [...byDay]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, xp]) => ({ date, xp })),
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
