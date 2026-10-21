import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CourseOverview,
  CoursePath,
  GitScenario,
  LessonDetail,
  LessonLanguage,
  LessonState,
  PracticeItem,
  PracticeSet,
  UnitBugHunt,
  UnitCheatSheet,
} from '@loophole/shared';
import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { exerciseKind } from '../../common/exercise-kind.js';
import {
  localizeCard,
  localizeCheck,
  localizeLearn,
  localizePrompt,
} from '../../common/lesson-text.js';
import { DbService } from '../../db/db.service.js';
import {
  certificates,
  courses,
  exercises,
  lessons,
  profiles,
  units,
  userProgress,
} from '../../db/schema/index.js';
import { orderCourses } from './course-order.js';
import { lessonStates } from './lesson-states.js';
import { pickPractice } from './practice.js';

// The columns a course summary exposes, reused by every query below.
const COURSE_COLUMNS = {
  id: courses.id,
  slug: courses.slug,
  title: courses.title,
  language: courses.language,
};

@Injectable()
export class LessonsService {
  constructor(private readonly db: DbService) {}

  // The course catalog (ADR-023): every course with its lesson count and
  // this user's progress in it, ordered by orderCourses().
  async listCourses(userId: string): Promise<CourseOverview[]> {
    const catalog = await this.db.drizzle
      .select({
        ...COURSE_COLUMNS,
        description: courses.description,
        lessonCount: count(lessons.id),
      })
      .from(courses)
      .leftJoin(units, eq(units.courseId, courses.id))
      .leftJoin(lessons, eq(lessons.unitId, units.id))
      .groupBy(courses.id);

    const progress = await this.db.drizzle
      .select({
        courseId: units.courseId,
        completedCount: count(),
        lastActivityAt: max(userProgress.completedAt),
      })
      .from(userProgress)
      .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(eq(userProgress.userId, userId))
      .groupBy(units.courseId);
    const byCourse = new Map(progress.map((p) => [p.courseId, p]));

    return orderCourses(
      catalog.map((c) => {
        const mine = byCourse.get(c.id);
        return {
          ...c,
          completedCount: mine?.completedCount ?? 0,
          lastActivityAt: mine?.lastActivityAt?.toISOString() ?? null,
        };
      }),
    );
  }

  async getPath(userId: string, courseSlug: string): Promise<CoursePath> {
    const [course] = await this.db.drizzle
      .select(COURSE_COLUMNS)
      .from(courses)
      .where(eq(courses.slug, courseSlug));
    if (!course) throw notFound('Course');

    const rows = await this.orderedLessons(course.id);
    const states = await this.statesFor(userId, rows);

    // Each unit's bug cards: the length of its Bug hunt (ADR-031).
    const learnRows = await this.db.drizzle
      .select({ unitId: lessons.unitId, learn: lessons.learn })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(eq(units.courseId, course.id));
    const bugsByUnit = new Map<string, number>();
    for (const { unitId, learn } of learnRows) {
      const bugs = (learn?.cards ?? []).filter((c) => c.bug).length;
      bugsByUnit.set(unitId, (bugsByUnit.get(unitId) ?? 0) + bugs);
    }

    // Group the flat, ordered rows into units, keeping their order.
    const unitsById = new Map<string, CoursePath['units'][number]>();
    for (const row of rows) {
      let unit = unitsById.get(row.unitId);
      if (!unit) {
        unit = {
          id: row.unitId,
          title: row.unitTitle,
          lessons: [],
          bugs: bugsByUnit.get(row.unitId) ?? 0,
        };
        unitsById.set(row.unitId, unit);
      }
      unit.lessons.push({
        id: row.lessonId,
        title: row.lessonTitle,
        state: states.get(row.lessonId) ?? 'locked',
      });
    }

    // The path ends at the certificate once it's earned (ADR-030).
    const [certificate] = await this.db.drizzle
      .select({ slug: certificates.publicSlug })
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, userId),
          eq(certificates.courseId, course.id),
        ),
      );
    return {
      course,
      units: [...unitsById.values()],
      certificateSlug: certificate?.slug ?? null,
    };
  }

  // A unit's cheat sheet (ADR-030): every lesson's Learn cards, in path
  // order. Open for every unit, locked ones included, like a guidebook:
  // cards only teach, so nothing graded or secret is in them.
  async getCheatSheet(
    userId: string,
    courseSlug: string,
    unitId: string,
  ): Promise<UnitCheatSheet> {
    const rows = await this.unitLessons(courseSlug, unitId);
    const language = await this.lessonLanguage(userId);
    return {
      unitId,
      title: rows[0].unitTitle,
      lessons: rows.map((row) => ({
        title: row.lessonTitle,
        // Teaching cards only: a bug card belongs to the Bug hunt
        // (ADR-031). Examples keep their code; input and output are for
        // running.
        cards: (row.learn?.cards ?? [])
          .filter((card) => !card.bug)
          .map((card) => localizeCard(card, language))
          .map(({ title, body, code }) =>
            code === undefined ? { title, body } : { title, body, code },
          ),
      })),
    };
  }

  // A unit's Bug hunt (ADR-031): every spot-the-bug card in it, in path
  // order, for an ungraded review. Answers may travel to the browser: like
  // the quick check, nothing here pays XP.
  async getBugHunt(
    userId: string,
    courseSlug: string,
    unitId: string,
  ): Promise<UnitBugHunt> {
    const rows = await this.unitLessons(courseSlug, unitId);
    const language = await this.lessonLanguage(userId);
    return {
      unitId,
      title: rows[0].unitTitle,
      bugs: rows.flatMap((row) =>
        (row.learn?.cards ?? [])
          .map((card) => localizeCard(card, language))
          .flatMap(({ title, body, code, bug }) =>
            bug && code !== undefined
              ? [{ lesson: row.lessonTitle, title, body, code, bug }]
              : [],
          ),
      ),
    };
  }

  // The practice stop (ADR-037): quick checks and bug cards from the
  // lessons this user finished in the course, older ones more often.
  // Answers travel to the browser, as they already do in lessons: nothing
  // here is graded or paid.
  async getPractice(userId: string, courseSlug: string): Promise<PracticeSet> {
    const [course] = await this.db.drizzle
      .select(COURSE_COLUMNS)
      .from(courses)
      .where(eq(courses.slug, courseSlug));
    if (!course) throw notFound('Course');

    const done = await this.db.drizzle
      .select({ title: lessons.title, learn: lessons.learn })
      .from(userProgress)
      .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(
        and(eq(userProgress.userId, userId), eq(units.courseId, course.id)),
      )
      // Finished longest ago first: pickPractice weighs those the most.
      .orderBy(asc(userProgress.completedAt));

    const language = await this.lessonLanguage(userId);
    const pool = done.flatMap(({ title, learn }): PracticeItem[] => [
      ...(learn
        ? [
            {
              kind: 'check' as const,
              lesson: title,
              check: localizeCheck(learn.check, language),
            },
          ]
        : []),
      ...(learn?.cards ?? [])
        .map((card) => localizeCard(card, language))
        .flatMap(({ body, code, bug }) =>
          bug && code !== undefined
            ? [{ kind: 'bug' as const, lesson: title, body, code, bug }]
            : [],
        ),
    ]);
    return { course, items: pickPractice(pool) };
  }

  // The language this user reads lessons in (ADR-042); English until
  // they pick, or before their profile exists.
  private async lessonLanguage(userId: string): Promise<LessonLanguage> {
    const [row] = await this.db.drizzle
      .select({ language: profiles.lessonLanguage })
      .from(profiles)
      .where(eq(profiles.id, userId));
    return row?.language ?? 'en';
  }

  // A unit's lessons with their Learn step, in path order. 404 unless the
  // unit belongs to that course.
  private async unitLessons(courseSlug: string, unitId: string) {
    const rows = await this.db.drizzle
      .select({
        unitTitle: units.title,
        lessonTitle: lessons.title,
        learn: lessons.learn,
      })
      .from(units)
      .innerJoin(courses, eq(units.courseId, courses.id))
      .innerJoin(lessons, eq(lessons.unitId, units.id))
      .where(and(eq(courses.slug, courseSlug), eq(units.id, unitId)))
      .orderBy(asc(lessons.position));
    if (rows.length === 0) throw notFound('Unit');
    return rows;
  }

  async getLesson(userId: string, lessonId: string): Promise<LessonDetail> {
    // Explicit columns: hidden_tests is never selected here (hard rule 2).
    const [lesson] = await this.db.drizzle
      .select({
        id: lessons.id,
        title: lessons.title,
        learn: lessons.learn,
        courseId: units.courseId,
        course: {
          slug: courses.slug,
          title: courses.title,
          language: courses.language,
        },
        language: courses.language,
        // Checks are all shown to the learner; only their labels are sent.
        checks: exercises.checks,
        gitScenario: exercises.gitScenario,
        promptHi: exercises.promptHi,
        exercise: {
          id: exercises.id,
          prompt: exercises.prompt,
          starterCode: exercises.starterCode,
          sampleTests: exercises.sampleTests,
        },
      })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(courses, eq(units.courseId, courses.id))
      .innerJoin(exercises, eq(exercises.lessonId, lessons.id))
      .where(eq(lessons.id, lessonId));
    if (!lesson) throw notFound('Lesson');

    await this.assertUnlocked(userId, lesson.id, lesson.courseId);
    // ADR-042: the learner's language; stored Hinglish never goes out as is.
    const language = await this.lessonLanguage(userId);
    return {
      id: lesson.id,
      title: lesson.title,
      course: lesson.course,
      learn: localizeLearn(lesson.learn, language),
      exercise: {
        ...lesson.exercise,
        prompt: localizePrompt(
          lesson.exercise.prompt,
          lesson.promptHi,
          language,
        ),
        kind: exerciseKind(lesson.language),
        checks: (lesson.checks ?? lesson.gitScenario?.checks ?? []).map(
          (c) => c.label,
        ),
      },
    };
  }

  // The course language of an unlocked lesson, for POST /runs. 404 for an
  // unknown lesson, 403 LESSON_LOCKED for one the user hasn't reached.
  async languageOf(userId: string, lessonId: string): Promise<string> {
    const [lesson] = await this.db.drizzle
      .select({ courseId: courses.id, language: courses.language })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(courses, eq(units.courseId, courses.id))
      .where(eq(lessons.id, lessonId));
    if (!lesson) throw notFound('Lesson');

    await this.assertUnlocked(userId, lessonId, lesson.courseId);
    return lesson.language;
  }

  // The course language and git scenario of an unlocked lesson, for
  // POST /git/run (ADR-026). Same 404 / 403 as languageOf.
  async gitLessonOf(
    userId: string,
    lessonId: string,
  ): Promise<{ language: string; scenario: GitScenario | null }> {
    const [lesson] = await this.db.drizzle
      .select({
        courseId: courses.id,
        language: courses.language,
        scenario: exercises.gitScenario,
      })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(courses, eq(units.courseId, courses.id))
      .innerJoin(exercises, eq(exercises.lessonId, lessons.id))
      .where(eq(lessons.id, lessonId));
    if (!lesson) throw notFound('Lesson');

    await this.assertUnlocked(userId, lessonId, lesson.courseId);
    return { language: lesson.language, scenario: lesson.scenario };
  }

  // Throws 403 LESSON_LOCKED unless the lesson is active or completed for
  // this user. Also used by SubmissionsService before grading.
  async assertUnlocked(
    userId: string,
    lessonId: string,
    courseId: string,
  ): Promise<void> {
    const rows = await this.orderedLessons(courseId);
    const states = await this.statesFor(userId, rows);
    if (states.get(lessonId) === 'locked') {
      throw new ForbiddenException({
        code: 'LESSON_LOCKED',
        message: 'Finish the previous lesson first.',
      });
    }
  }

  // Every lesson in a course, in path order.
  private orderedLessons(courseId: string) {
    return this.db.drizzle
      .select({
        unitId: units.id,
        unitTitle: units.title,
        lessonId: lessons.id,
        lessonTitle: lessons.title,
      })
      .from(units)
      .innerJoin(lessons, eq(lessons.unitId, units.id))
      .where(eq(units.courseId, courseId))
      .orderBy(asc(units.position), asc(lessons.position));
  }

  private async statesFor(
    userId: string,
    rows: { lessonId: string }[],
  ): Promise<Map<string, LessonState>> {
    const ids = rows.map((r) => r.lessonId);
    const done = ids.length
      ? await this.db.drizzle
          .select({ lessonId: userProgress.lessonId })
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              inArray(userProgress.lessonId, ids),
            ),
          )
      : [];
    return lessonStates(ids, new Set(done.map((d) => d.lessonId)));
  }
}

function notFound(what: string): NotFoundException {
  return new NotFoundException({
    code: 'NOT_FOUND',
    message: `${what} not found.`,
  });
}
