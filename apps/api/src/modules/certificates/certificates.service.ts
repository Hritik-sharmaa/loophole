import { Injectable, NotFoundException } from '@nestjs/common';
import type { CertificateSummary, PublicCertificate } from '@loophole/shared';
import { and, count, desc, eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import { DbService } from '../../db/db.service.js';
import {
  certificates,
  courses,
  lessons,
  profiles,
  units,
  userProgress,
} from '../../db/schema/index.js';

// Public slugs: 10 characters, without look-alikes (0/o, 1/l/i), so a
// link read aloud or typed from a printout still works.
const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SLUG_LENGTH = 10;
const SLUG_PATTERN = new RegExp(`^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`);
const SLUG_ATTEMPTS = 5;

@Injectable()
export class CertificatesService {
  constructor(private readonly db: DbService) {}

  // FR-15: after a lesson completes, issue the course certificate if every
  // lesson in that course is now done. Returns the new slug only when this
  // call issued it; a later completion returns null (the unique key on
  // user + course makes a second certificate impossible).
  async issueIfComplete(
    userId: string,
    lessonId: string,
  ): Promise<string | null> {
    const [lesson] = await this.db.drizzle
      .select({ courseId: units.courseId })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(eq(lessons.id, lessonId));
    if (!lesson) return null;
    const { courseId } = lesson;

    const [{ total }] = await this.db.drizzle
      .select({ total: count() })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(eq(units.courseId, courseId));
    const [{ done }] = await this.db.drizzle
      .select({ done: count() })
      .from(userProgress)
      .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(
        and(eq(userProgress.userId, userId), eq(units.courseId, courseId)),
      );
    if (total === 0 || done < total) return null;

    // A random slug can (very rarely) collide with an existing one: retry.
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
      try {
        const [issued] = await this.db.drizzle
          .insert(certificates)
          .values({ userId, courseId, publicSlug: newSlug() })
          .onConflictDoNothing({
            target: [certificates.userId, certificates.courseId],
          })
          .returning({ slug: certificates.publicSlug });
        return issued?.slug ?? null;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    throw new Error('Could not pick a free certificate slug');
  }

  // GET /certificates: the user's own, newest first.
  async listMine(userId: string): Promise<CertificateSummary[]> {
    const rows = await this.db.drizzle
      .select({
        slug: certificates.publicSlug,
        courseTitle: courses.title,
        issuedAt: certificates.issuedAt,
      })
      .from(certificates)
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.userId, userId))
      .orderBy(desc(certificates.issuedAt));
    return rows.map((r) => ({ ...r, issuedAt: r.issuedAt.toISOString() }));
  }

  // GET /certificates/:slug, public: only what the certificate shows.
  async getPublic(slug: string): Promise<PublicCertificate> {
    const [row] = SLUG_PATTERN.test(slug)
      ? await this.db.drizzle
          .select({
            username: profiles.username,
            courseTitle: courses.title,
            issuedAt: certificates.issuedAt,
          })
          .from(certificates)
          .innerJoin(profiles, eq(certificates.userId, profiles.id))
          .innerJoin(courses, eq(certificates.courseId, courses.id))
          .where(eq(certificates.publicSlug, slug))
      : [];
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Certificate not found.',
      });
    }
    return { ...row, issuedAt: row.issuedAt.toISOString() };
  }
}

function newSlug(): string {
  return Array.from(
    { length: SLUG_LENGTH },
    () => SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)],
  ).join('');
}

// Drizzle wraps driver errors, so the Postgres code may sit on `cause`.
function isUniqueViolation(err: unknown): boolean {
  const codeOf = (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e ? e.code : undefined;
  const cause =
    typeof err === 'object' && err !== null && 'cause' in err
      ? err.cause
      : undefined;
  return codeOf(err) === '23505' || codeOf(cause) === '23505';
}
