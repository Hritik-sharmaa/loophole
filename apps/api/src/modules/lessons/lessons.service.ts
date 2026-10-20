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
  LessonState,
} from '@loophole/shared';
import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { exerciseKind } from '../../common/exercise-kind.js';
import { DbService } from '../../db/db.service.js';
import {
  courses,
  exercises,
  lessons,
  units,
  userProgress,
} from '../../db/schema/index.js';
import { orderCourses } from './course-order.js';
import { lessonStates } from './lesson-states.js';

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

    // Group the flat, ordered rows into units, keeping their order.
    const unitsById = new Map<string, CoursePath['units'][number]>();
    for (const row of rows) {
      let unit = unitsById.get(row.unitId);
      if (!unit) {
        unit = { id: row.unitId, title: row.unitTitle, lessons: [] };
        unitsById.set(row.unitId, unit);
      }
      unit.lessons.push({
        id: row.lessonId,
        title: row.lessonTitle,
        state: states.get(row.lessonId) ?? 'locked',
      });
    }
    return { course, units: [...unitsById.values()] };
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
    return {
      id: lesson.id,
      title: lesson.title,
      course: lesson.course,
      learn: lesson.learn,
      exercise: {
        ...lesson.exercise,
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
