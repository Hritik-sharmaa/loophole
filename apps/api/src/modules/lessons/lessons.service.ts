import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CoursePath,
  CourseSummary,
  LessonDetail,
  LessonState,
} from '@loophole/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import {
  courses,
  exercises,
  lessons,
  units,
  userProgress,
} from '../../db/schema/index.js';
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

  listCourses(): Promise<CourseSummary[]> {
    return this.db.drizzle
      .select(COURSE_COLUMNS)
      .from(courses)
      .orderBy(asc(courses.title));
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
        courseId: units.courseId,
        exercise: {
          id: exercises.id,
          prompt: exercises.prompt,
          starterCode: exercises.starterCode,
          sampleTests: exercises.sampleTests,
        },
      })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .innerJoin(exercises, eq(exercises.lessonId, lessons.id))
      .where(eq(lessons.id, lessonId));
    if (!lesson) throw notFound('Lesson');

    const rows = await this.orderedLessons(lesson.courseId);
    const states = await this.statesFor(userId, rows);
    if (states.get(lesson.id) === 'locked') {
      throw new ForbiddenException({
        code: 'LESSON_LOCKED',
        message: 'Finish the previous lesson first.',
      });
    }

    return { id: lesson.id, title: lesson.title, exercise: lesson.exercise };
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
