import { Injectable, NotFoundException } from '@nestjs/common';
import type { SubmissionResult, SubmissionSummary } from '@loophole/shared';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import {
  courses,
  exercises,
  lessons,
  submissions,
  units,
  userProgress,
} from '../../db/schema/index.js';
import {
  PistonClient,
  type RunResult,
} from '../../integrations/piston.client.js';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { GamificationService } from '../gamification/gamification.service.js';
import { LessonsService } from '../lessons/lessons.service.js';
import { UsersService } from '../users/users.service.js';
import type { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { grade, type TestRun } from './grading.js';

// How many past submissions GET /submissions returns.
const HISTORY_LIMIT = 10;

// Stands in for a test that was not run; grade() counts it as failed.
const SKIPPED: RunResult = {
  stdout: '',
  stderr: '',
  exitCode: null,
  timedOut: false,
};

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly db: DbService,
    private readonly piston: PistonClient,
    private readonly lessons: LessonsService,
    private readonly users: UsersService,
    private readonly gamification: GamificationService,
  ) {}

  // docs/ARCHITECTURE.md §3.1. Hidden tests are loaded here and leave this
  // method only as pass/fail, through grade().
  async submit(
    user: AuthUser,
    { exerciseId, code }: CreateSubmissionDto,
  ): Promise<SubmissionResult> {
    const [exercise] = await this.db.drizzle
      .select({
        lessonId: exercises.lessonId,
        courseId: units.courseId,
        language: courses.language,
        sampleTests: exercises.sampleTests,
        hiddenTests: exercises.hiddenTests,
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
    // The rows below point at profiles; a brand-new user may not have one yet.
    await this.users.ensureProfile(user);

    const tests = [
      ...exercise.sampleTests.map((test) => ({
        kind: 'sample' as const,
        test,
      })),
      ...exercise.hiddenTests.map((test) => ({
        kind: 'hidden' as const,
        test,
      })),
    ];
    // One test at a time (PistonClient queues runs anyway). After a time-out
    // the rest are skipped: a program that hangs would otherwise hold the
    // shared Piston queue for 3 s per test.
    const runs: TestRun[] = [];
    for (const t of tests) {
      const timedOutBefore = runs.some((r) => r.run.timedOut);
      const run = timedOutBefore
        ? SKIPPED
        : await this.piston.run(exercise.language, code, t.test.input);
      runs.push({ ...t, run });
    }
    const result = grade(runs);

    const [row] = await this.db.drizzle
      .insert(submissions)
      .values({
        userId: user.id,
        exerciseId,
        code,
        status: result.status,
        testsPassed: result.testsPassed,
        totalTests: result.totalTests,
        stderr: result.stderr,
        results: result.results,
      })
      .returning({ id: submissions.id });

    const passed = result.status === 'passed';
    let xpAwarded = 0;
    if (passed) {
      // FR-08. The (user_id, lesson_id) primary key makes a repeat pass a
      // no-op; the next lesson unlocks because lessonStates() reads this row.
      await this.db.drizzle
        .insert(userProgress)
        .values({ userId: user.id, lessonId: exercise.lessonId })
        .onConflictDoNothing();
      // After the progress write (ARCHITECTURE §2.5). Called on every pass,
      // not only the first: it pays once anyway, and a pass whose award
      // failed half-way gets paid on the next one.
      xpAwarded = await this.gamification.awardLesson(
        user.id,
        exercise.lessonId,
      );
    }

    return {
      id: row.id,
      status: result.status,
      testsPassed: result.testsPassed,
      totalTests: result.totalTests,
      lessonCompleted: passed,
      xpAwarded,
      results: result.results,
      stderr: result.stderr,
    };
  }

  // The user's own latest submissions for one exercise, newest first.
  async list(userId: string, exerciseId: string): Promise<SubmissionSummary[]> {
    const rows = await this.db.drizzle
      .select({
        id: submissions.id,
        status: submissions.status,
        testsPassed: submissions.testsPassed,
        totalTests: submissions.totalTests,
        code: submissions.code,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, userId),
          eq(submissions.exerciseId, exerciseId),
        ),
      )
      .orderBy(desc(submissions.submittedAt))
      .limit(HISTORY_LIMIT);

    return rows.map((r) => ({
      ...r,
      submittedAt: r.submittedAt.toISOString(),
    }));
  }
}
