import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DailyBugBoard,
  DailyBugPlay,
  DailyBugResult,
  DailyBugToday,
} from '@loophole/shared';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { istDate } from '../../common/ist-calendar.js';
import { DbService } from '../../db/db.service.js';
import {
  dailyBugPlays,
  duelProblems,
  profiles,
} from '../../db/schema/index.js';
import { PistonClient } from '../../integrations/piston.client.js';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { GamificationService } from '../gamification/gamification.service.js';
import { grade } from '../submissions/grading.js';
import { runTests } from '../submissions/run-tests.js';
import { UsersService } from '../users/users.service.js';
import { dailyPick, rankSolves, solveTimeMs } from './daily-bug-rules.js';

// The pool: the duel problems in this language (content/duels/python).
const POOL_LANGUAGE = 'python';

// How many solves the board lists.
const BOARD_SIZE = 10;

type Play = typeof dailyBugPlays.$inferSelect;

// FR-28, ADR-035: one buggy program a day for everyone. Graded like a duel
// (Piston, sample and hidden tests); hidden tests leave this service only
// as pass/fail, through grade() (hard rule 2).
@Injectable()
export class DailyBugService {
  constructor(
    private readonly db: DbService,
    private readonly piston: PistonClient,
    private readonly users: UsersService,
    private readonly gamification: GamificationService,
  ) {}

  // GET /bug-of-the-day. The caller's first call of the IST day opens it
  // and starts their clock; later calls change nothing.
  async today(user: AuthUser, now = new Date()): Promise<DailyBugToday> {
    await this.users.ensureProfile(user);
    const day = istDate(now);
    const pickId = await this.todaysProblemId(day);

    await this.db.drizzle
      .insert(dailyBugPlays)
      .values({ userId: user.id, day, problemId: pickId, openedAt: now })
      .onConflictDoNothing();
    const play = (await this.playOf(user.id, day))!;

    // The play's problem, not today's pick: if the pool changed since the
    // caller opened it, they keep the bug they started.
    const [problem] = await this.db.drizzle
      .select({
        title: duelProblems.title,
        description: duelProblems.description,
        buggyCode: duelProblems.buggyCode,
        sampleTests: duelProblems.sampleTests,
      })
      .from(duelProblems)
      .where(eq(duelProblems.id, play.problemId));
    return { day, problem, me: toPlay(play) };
  }

  // GET /bug-of-the-day/board. Reading it never starts the caller's clock.
  async board(userId: string, now = new Date()): Promise<DailyBugBoard> {
    const day = istDate(now);
    const [{ title }] = await this.db.drizzle
      .select({ title: duelProblems.title })
      .from(duelProblems)
      .where(eq(duelProblems.id, await this.todaysProblemId(day)));

    const solves = await this.db.drizzle
      .select({
        userId: dailyBugPlays.userId,
        username: profiles.username,
        openedAt: dailyBugPlays.openedAt,
        solvedAt: dailyBugPlays.solvedAt,
        attempts: dailyBugPlays.attempts,
      })
      .from(dailyBugPlays)
      .innerJoin(profiles, eq(profiles.id, dailyBugPlays.userId))
      .where(
        and(eq(dailyBugPlays.day, day), isNotNull(dailyBugPlays.solvedAt)),
      );
    const ranked = rankSolves(
      solves.map((s) => ({ ...s, solvedAt: s.solvedAt! })),
    );
    const mine = ranked.find((r) => r.userId === userId);
    const started = (await this.playOf(userId, day)) !== undefined;

    return {
      day,
      title,
      solvers: ranked.length,
      entries: ranked.slice(0, BOARD_SIZE),
      me: mine ? { rank: mine.rank, timeMs: mine.timeMs } : null,
      started,
    };
  }

  // POST /bug-of-the-day/submissions. Grades against the caller's play of
  // today; 409 NOT_STARTED if they haven't opened today's bug (a new IST
  // day began, or they never loaded it), so nobody can skip the clock.
  async submit(
    user: AuthUser,
    code: string,
    now = new Date(),
  ): Promise<DailyBugResult> {
    const day = istDate(now);
    const play = await this.playOf(user.id, day);
    if (!play) {
      throw new ConflictException({
        code: 'NOT_STARTED',
        message: "Open today's bug first: a new one starts at midnight.",
      });
    }

    const [problem] = await this.db.drizzle
      .select({
        language: duelProblems.language,
        sampleTests: duelProblems.sampleTests,
        hiddenTests: duelProblems.hiddenTests,
      })
      .from(duelProblems)
      .where(eq(duelProblems.id, play.problemId));
    const result = grade(
      await runTests(
        this.piston,
        problem.language,
        code,
        problem.sampleTests,
        problem.hiddenTests,
      ),
    );

    await this.db.drizzle
      .update(dailyBugPlays)
      .set({ attempts: sql`${dailyBugPlays.attempts} + 1` })
      .where(eq(dailyBugPlays.id, play.id));

    let solvedAt = play.solvedAt;
    if (result.status === 'passed' && !solvedAt) {
      // Conditional: of two passes racing, only the first sets the time.
      const [first] = await this.db.drizzle
        .update(dailyBugPlays)
        .set({ solvedAt: now })
        .where(
          and(eq(dailyBugPlays.id, play.id), isNull(dailyBugPlays.solvedAt)),
        )
        .returning({ solvedAt: dailyBugPlays.solvedAt });
      solvedAt = first?.solvedAt ?? (await this.playOf(user.id, day))!.solvedAt;
    }

    // Paid on every pass, but only once: the xp_events key is the play.
    const xpAwarded = solvedAt
      ? await this.gamification.awardDailyBug(user.id, play.id, now)
      : 0;
    const board = await this.board(user.id, now);

    return {
      status: result.status,
      testsPassed: result.testsPassed,
      totalTests: result.totalTests,
      results: result.results,
      stderr: result.stderr,
      solved: solvedAt !== null,
      xpAwarded,
      timeMs: solvedAt ? solveTimeMs(play.openedAt, solvedAt) : null,
      rank: board.me?.rank ?? null,
      solvers: board.solvers,
    };
  }

  // The pool in a fixed order (by slug), then dailyPick() for the day.
  private async todaysProblemId(day: string): Promise<string> {
    const pool = await this.db.drizzle
      .select({ id: duelProblems.id })
      .from(duelProblems)
      .where(eq(duelProblems.language, POOL_LANGUAGE))
      .orderBy(asc(duelProblems.slug));
    if (pool.length === 0) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'There is no bug of the day yet.',
      });
    }
    return pool[dailyPick(day, pool.length)].id;
  }

  private async playOf(userId: string, day: string): Promise<Play | undefined> {
    const [play] = await this.db.drizzle
      .select()
      .from(dailyBugPlays)
      .where(and(eq(dailyBugPlays.userId, userId), eq(dailyBugPlays.day, day)));
    return play;
  }
}

function toPlay(play: Play): DailyBugPlay {
  return {
    openedAt: play.openedAt.toISOString(),
    solvedAt: play.solvedAt?.toISOString() ?? null,
    timeMs: play.solvedAt ? solveTimeMs(play.openedAt, play.solvedAt) : null,
    attempts: play.attempts,
  };
}
