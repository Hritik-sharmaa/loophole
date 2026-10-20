import type { CourseOverview } from '@loophole/shared';

// Catalog order (ADR-023): courses the user has worked on first, the most
// recent one on top, so "continue" is always the first card; then the
// rest by title. Pure, so it is unit-tested.
export function orderCourses(
  list: readonly CourseOverview[],
): CourseOverview[] {
  return [...list].sort((a, b) => {
    if (a.lastActivityAt && b.lastActivityAt) {
      return b.lastActivityAt.localeCompare(a.lastActivityAt);
    }
    if (a.lastActivityAt) return -1;
    if (b.lastActivityAt) return 1;
    return a.title.localeCompare(b.title);
  });
}
