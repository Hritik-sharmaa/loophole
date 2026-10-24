import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BotDuel,
  BotDuelSubmission,
  BotOpponent,
  DuelLanguage,
} from '@loophole/shared';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import { botDuels, duelProblems } from '../../db/schema/index.js';
import { PistonClient } from '../../integrations/piston.client.js';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { DUEL_DURATION_MS } from '../duels/duel-rules.js';
import { grade } from '../submissions/grading.js';
import { runTests } from '../submissions/run-tests.js';
import { UsersService } from '../users/users.service.js';
import { botFinishAt, botSchedule } from './bot-duel-rules.js';

type Row = typeof botDuels.$inferSelect;

// Practice duels against a guide bot (ADR-039): a live duel's problem and
// grading, against a crew member who fixes it on a schedule picked when
// the race starts. The server decides the result from its own clock; no
// rating, no XP. There is no timer: a race the bot has finished is marked
// lost the next time it is read.
@Injectable()
export class BotDuelsService {
  constructor(
    private readonly db: DbService,
    private readonly piston: PistonClient,
    private readonly users: UsersService,
  ) {}

  // POST /bot-duels: a random problem from the live duels' pool in that
  // language (ADR-040) and a fresh schedule.
  async start(
    user: AuthUser,
    opponent: BotOpponent,
    language: DuelLanguage,
    now = new Date(),
  ): Promise<BotDuel> {
    await this.users.ensureProfile(user);
    const [problem] = await this.db.drizzle
      .select({
        id: duelProblems.id,
        sampleTests: duelProblems.sampleTests,
        hiddenTests: duelProblems.hiddenTests,
      })
      .from(duelProblems)
      .where(eq(duelProblems.language, language))
      .orderBy(sql`random()`)
      .limit(1);
    if (!problem) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'There are no duel problems yet.',
      });
    }

    const totalTests = problem.sampleTests.length + problem.hiddenTests.length;
    const [row] = await this.db.drizzle
      .insert(botDuels)
      .values({
        userId: user.id,
        problemId: problem.id,
        opponent,
        startedAt: now,
        endsAt: new Date(now.getTime() + DUEL_DURATION_MS),
        botSchedule: botSchedule(opponent, totalTests),
      })
      .returning();
    return this.view(row);
  }

  // GET /bot-duels/:id. Someone else's race is "not found".
  async get(userId: string, id: string, now = new Date()): Promise<BotDuel> {
    return this.view(await this.settled(userId, id, now));
  }

  // POST /bot-duels/:id/submissions. Graded like a live duel; a full pass
  // received before the bot's finish wins.
  async submit(
    userId: string,
    id: string,
    code: string,
    now = new Date(),
  ): Promise<BotDuelSubmission> {
    const race = await this.running(userId, id, now);
    const [problem] = await this.db.drizzle
      .select({
        language: duelProblems.language,
        sampleTests: duelProblems.sampleTests,
        hiddenTests: duelProblems.hiddenTests,
      })
      .from(duelProblems)
      .where(eq(duelProblems.id, race.problemId));
    const result = grade(
      await runTests(
        this.piston,
        userId,
        problem.language,
        code,
        problem.sampleTests,
        problem.hiddenTests,
      ),
    );

    await this.db.drizzle
      .update(botDuels)
      .set({ attempts: sql`${botDuels.attempts} + 1` })
      .where(eq(botDuels.id, race.id));
    if (result.status === 'passed') {
      // Set once. It also beats a 'lost' that was recorded while this fix
      // was being graded: the fix arrived before the bot's finish.
      await this.db.drizzle
        .update(botDuels)
        .set({ result: 'won', finishedAt: now })
        .where(
          and(
            eq(botDuels.id, race.id),
            or(
              isNull(botDuels.result),
              and(eq(botDuels.result, 'lost'), gt(botDuels.finishedAt, now)),
            ),
          ),
        );
    }

    return {
      status: result.status,
      testsPassed: result.testsPassed,
      totalTests: result.totalTests,
      results: result.results,
      stderr: result.stderr,
      duel: await this.get(userId, id, now),
    };
  }

  // POST /bot-duels/:id/forfeit
  async forfeit(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<BotDuel> {
    const race = await this.running(userId, id, now);
    await this.db.drizzle
      .update(botDuels)
      .set({ result: 'gave-up', finishedAt: now })
      .where(and(eq(botDuels.id, race.id), isNull(botDuels.result)));
    return this.get(userId, id, now);
  }

  // The caller's race, marked lost if the bot has finished by `now`.
  private async settled(userId: string, id: string, now: Date): Promise<Row> {
    const [row] = await this.db.drizzle
      .select()
      .from(botDuels)
      .where(and(eq(botDuels.id, id), eq(botDuels.userId, userId)));
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Duel not found.',
      });
    }
    const finish = botFinishAt(row.startedAt, row.botSchedule);
    if (row.result !== null || now < finish) return row;

    // The loss is dated at the bot's finish, not when it was noticed.
    const [lost] = await this.db.drizzle
      .update(botDuels)
      .set({ result: 'lost', finishedAt: finish })
      .where(and(eq(botDuels.id, row.id), isNull(botDuels.result)))
      .returning();
    return lost ?? (await this.settled(userId, id, now));
  }

  // The caller's race, or 409 if it is over.
  private async running(userId: string, id: string, now: Date): Promise<Row> {
    const race = await this.settled(userId, id, now);
    if (race.result !== null) {
      throw new ConflictException({
        code: 'ILLEGAL_TRANSITION',
        message: 'This duel is over.',
      });
    }
    return race;
  }

  private async view(row: Row): Promise<BotDuel> {
    const [problem] = await this.db.drizzle
      .select({
        title: duelProblems.title,
        language: duelProblems.language,
        description: duelProblems.description,
        buggyCode: duelProblems.buggyCode,
        sampleTests: duelProblems.sampleTests,
      })
      .from(duelProblems)
      .where(eq(duelProblems.id, row.problemId));
    return {
      id: row.id,
      opponent: row.opponent,
      // The seed only loads folders named after a DuelLanguage.
      problem: { ...problem, language: problem.language as DuelLanguage },
      startedAt: row.startedAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      totalTests: row.botSchedule.length,
      botSchedule: row.botSchedule,
      result: row.result,
      timeMs:
        row.result === 'won' && row.finishedAt
          ? row.finishedAt.getTime() - row.startedAt.getTime()
          : null,
      attempts: row.attempts,
    };
  }
}
