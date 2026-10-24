import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ExplainCardResponse,
  ExplainResponse,
  HintResponse,
} from '@loophole/shared';
import { and, eq, gt, sql } from 'drizzle-orm';
import { istDate } from '../../common/ist-calendar.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { DbService } from '../../db/db.service.js';
import {
  aiUsage,
  courses,
  exercises,
  lessons,
  submissions,
  units,
} from '../../db/schema/index.js';
import { GeminiClient } from '../../integrations/gemini.client.js';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { LessonsService } from '../lessons/lessons.service.js';
import { UsersService } from '../users/users.service.js';
import type { ExplainCardDto } from './dto/explain-card.dto.js';
import type { HintDto } from './dto/hint.dto.js';
import {
  GENERIC_EXPLANATION,
  GENERIC_HINT,
  containsCodeBlock,
  limitWords,
  validLine,
} from './tutor-guards.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly dailyLimit: number;

  constructor(
    private readonly db: DbService,
    private readonly gemini: GeminiClient,
    private readonly lessons: LessonsService,
    private readonly users: UsersService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.dailyLimit = config.get('AI_DAILY_LIMIT', { infer: true });
  }

  // FR-12: explain one of the user's own submissions. Only what the learner
  // already saw goes to Gemini: their code, the first failing example and
  // its stderr. Hidden tests are never loaded here (hard rule 2).
  async explain(
    user: AuthUser,
    submissionId: string,
  ): Promise<ExplainResponse> {
    const [row] = await this.db.drizzle
      .select({
        code: submissions.code,
        stderr: submissions.stderr,
        results: submissions.results,
        prompt: exercises.prompt,
        language: courses.language,
      })
      .from(submissions)
      .innerJoin(exercises, eq(submissions.exerciseId, exercises.id))
      .innerJoin(lessons, eq(exercises.lessonId, lessons.id))
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(courses, eq(units.courseId, courses.id))
      // Someone else's submission is "not found", not "forbidden".
      .where(
        and(eq(submissions.id, submissionId), eq(submissions.userId, user.id)),
      );
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Submission not found.',
      });
    }

    const failing = row.results.find((r) => r.kind === 'sample' && !r.passed);
    const failingCheck = row.results.find(
      (r) => r.kind === 'check' && !r.passed,
    );
    return this.withDailyCap(user.id, async (remainingToday) => {
      const out = await this.gemini.explainError({
        language: row.language,
        exercisePrompt: row.prompt,
        code: row.code,
        failingTest:
          failing?.kind === 'sample'
            ? {
                input: failing.input,
                expectedOutput: failing.expected,
                actualOutput: failing.actual,
              }
            : null,
        failingCheck:
          failingCheck?.kind === 'check' ? failingCheck.label : undefined,
        stderr: row.stderr,
      });
      // The learner's code is in the prompt, so it can try to talk the
      // tutor into writing the answer; the same check as hints.
      if (containsCodeBlock(out.explanation)) {
        this.logger.warn(
          'Explanation contained a code block; sent the generic one',
        );
        return { explanation: GENERIC_EXPLANATION, line: null, remainingToday };
      }
      return {
        explanation: limitWords(out.explanation),
        line: validLine(out.line, row.code),
        remainingToday,
      };
    });
  }

  // FR-13: one nudge for the code in the editor, never the answer.
  async hint(
    user: AuthUser,
    { exerciseId, code }: HintDto,
  ): Promise<HintResponse> {
    const [exercise] = await this.db.drizzle
      .select({
        prompt: exercises.prompt,
        lessonId: exercises.lessonId,
        courseId: units.courseId,
        language: courses.language,
      })
      .from(exercises)
      .innerJoin(lessons, eq(exercises.lessonId, lessons.id))
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(courses, eq(units.courseId, courses.id))
      .where(eq(exercises.id, exerciseId));
    if (!exercise) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Exercise not found.',
      });
    }
    await this.lessons.assertUnlocked(
      user.id,
      exercise.lessonId,
      exercise.courseId,
    );
    // ai_usage points at profiles; a hint can be a new user's first request.
    await this.users.ensureProfile(user);

    return this.withDailyCap(user.id, async (remainingToday) => {
      const { hint } = await this.gemini.giveHint({
        language: exercise.language,
        exercisePrompt: exercise.prompt,
        code,
      });
      if (containsCodeBlock(hint)) {
        this.logger.warn('Hint contained a code block; sent the generic hint');
        return { hint: GENERIC_HINT, remainingToday };
      }
      return { hint: limitWords(hint), remainingToday };
    });
  }

  // ADR-036: one Learn card explained again in other words. The card text
  // comes from the lesson on the server, never from the browser; only
  // teaching cards, since a spot-the-bug card's code holds its answer.
  async explainCard(
    user: AuthUser,
    { lessonId, card }: ExplainCardDto,
  ): Promise<ExplainCardResponse> {
    const [lesson] = await this.db.drizzle
      .select({
        title: lessons.title,
        learn: lessons.learn,
        courseId: units.courseId,
        language: courses.language,
      })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(courses, eq(units.courseId, courses.id))
      .where(eq(lessons.id, lessonId));
    const found = lesson?.learn?.cards[card];
    if (!lesson || !found || found.bug) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Card not found.',
      });
    }
    await this.lessons.assertUnlocked(user.id, lessonId, lesson.courseId);
    await this.users.ensureProfile(user);

    return this.withDailyCap(user.id, async (remainingToday) => {
      const { explanation } = await this.gemini.explainCard({
        language: lesson.language,
        lessonTitle: lesson.title,
        title: found.title,
        body: found.body,
        code: found.code,
      });
      return { explanation: limitWords(explanation), remainingToday };
    });
  }

  // FR-14: counts one request against today's cap (IST day), runs `call`,
  // and gives the request back if the tutor failed (docs/AI_TUTOR.md §2).
  private async withDailyCap<T>(
    userId: string,
    call: (remainingToday: number) => Promise<T>,
  ): Promise<T> {
    const day = istDate(new Date());
    // One atomic statement: the update only happens while under the cap,
    // so parallel requests can't both take the last slot.
    const [used] = await this.db.drizzle
      .insert(aiUsage)
      .values({ userId, day, count: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.day],
        set: { count: sql`${aiUsage.count} + 1` },
        setWhere: sql`${aiUsage.count} < ${this.dailyLimit}`,
      })
      .returning({ count: aiUsage.count });
    if (!used) {
      throw new HttpException(
        {
          code: 'DAILY_LIMIT_REACHED',
          message: `You have used all ${this.dailyLimit} tutor requests for today. They reset at midnight IST.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      return await call(this.dailyLimit - used.count);
    } catch (err) {
      await this.db.drizzle
        .update(aiUsage)
        .set({ count: sql`${aiUsage.count} - 1` })
        .where(
          and(
            eq(aiUsage.userId, userId),
            eq(aiUsage.day, day),
            gt(aiUsage.count, 0),
          ),
        );
      throw err;
    }
  }
}
