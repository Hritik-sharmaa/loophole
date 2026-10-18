import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { Db } from '../db.service.js';
import {
  courses,
  duelProblems,
  exercises,
  lessons,
  units,
} from '../schema/index.js';
import {
  loadAllContent,
  loadDuelProblems,
  type CourseContent,
} from './content-files.js';

export type SeedSummary = {
  courses: number;
  units: number;
  lessons: number;
  duelProblems: number;
  // "course/unit" or "course/unit/lesson" rows in the database that are no
  // longer in content/. They are left alone so no one's progress is deleted.
  stale: string[];
};

// Loads every course in contentDir into the database. Safe to run any number
// of times: rows are matched by slug and updated in place (FR-16).
export async function seedContent(
  db: Db,
  contentDir: string,
): Promise<SeedSummary> {
  const content = loadAllContent(contentDir);
  const problems = loadDuelProblems(contentDir);
  const summary: SeedSummary = {
    courses: 0,
    units: 0,
    lessons: 0,
    duelProblems: 0,
    stale: [],
  };

  await db.transaction(async (tx) => {
    for (const course of content) {
      await seedCourse(tx, course, summary);
    }
    // Duel problems are matched by slug too, so past duels keep their row.
    // (bugCount is for authors only; it is not stored.)
    for (const p of problems) {
      const fields = {
        language: p.language,
        title: p.title,
        description: p.description,
        buggyCode: p.buggyCode,
        sampleTests: p.sampleTests,
        hiddenTests: p.hiddenTests,
        difficulty: p.difficulty,
      };
      await tx
        .insert(duelProblems)
        .values({ slug: p.slug, ...fields })
        .onConflictDoUpdate({ target: duelProblems.slug, set: fields });
      summary.duelProblems++;
    }
  });
  return summary;
}

async function seedCourse(
  tx: Db,
  course: CourseContent,
  summary: SeedSummary,
): Promise<void> {
  const [{ id: courseId }] = await tx
    .insert(courses)
    .values({
      slug: course.slug,
      title: course.title,
      language: course.language,
    })
    .onConflictDoUpdate({
      target: courses.slug,
      set: { title: course.title, language: course.language },
    })
    .returning({ id: courses.id });
  summary.courses++;

  // Positions are unique per course, so park the current ones on negative
  // numbers first; otherwise swapping two units' positions would collide.
  const unitSlugs = course.units.map((u) => u.slug);
  await tx
    .update(units)
    .set({ position: sql`-${units.position}` })
    .where(and(eq(units.courseId, courseId), inArray(units.slug, unitSlugs)));

  for (const unit of course.units) {
    const [{ id: unitId }] = await tx
      .insert(units)
      .values({
        courseId,
        slug: unit.slug,
        title: unit.title,
        position: unit.position,
      })
      .onConflictDoUpdate({
        target: [units.courseId, units.slug],
        set: { title: unit.title, position: unit.position },
      })
      .returning({ id: units.id });
    summary.units++;

    const lessonSlugs = unit.lessons.map((l) => l.slug);
    await tx
      .update(lessons)
      .set({ position: sql`-${lessons.position}` })
      .where(
        and(eq(lessons.unitId, unitId), inArray(lessons.slug, lessonSlugs)),
      );

    for (const lesson of unit.lessons) {
      const [{ id: lessonId }] = await tx
        .insert(lessons)
        .values({
          unitId,
          slug: lesson.slug,
          title: lesson.title,
          position: lesson.position,
        })
        .onConflictDoUpdate({
          target: [lessons.unitId, lessons.slug],
          set: { title: lesson.title, position: lesson.position },
        })
        .returning({ id: lessons.id });

      await tx
        .insert(exercises)
        .values({ lessonId, ...lesson.exercise })
        .onConflictDoUpdate({
          target: exercises.lessonId,
          set: lesson.exercise,
        });
      summary.lessons++;
    }

    const staleLessons = await tx
      .select({ slug: lessons.slug })
      .from(lessons)
      .where(
        and(eq(lessons.unitId, unitId), notInArray(lessons.slug, lessonSlugs)),
      );
    for (const { slug } of staleLessons) {
      summary.stale.push(`${course.slug}/${unit.slug}/${slug}`);
    }
  }

  const staleUnits = await tx
    .select({ slug: units.slug })
    .from(units)
    .where(
      and(eq(units.courseId, courseId), notInArray(units.slug, unitSlugs)),
    );
  for (const { slug } of staleUnits) {
    summary.stale.push(`${course.slug}/${slug}`);
  }
}
