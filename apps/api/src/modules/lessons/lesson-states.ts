import type { LessonState } from '@loophole/shared';

// The one place that decides which lessons a user may open (FR-04).
// orderedLessonIds is the whole course in path order (unit position, then
// lesson position). Completed lessons stay open; the first lesson not yet
// completed is the active one; everything after it is locked.
//
// Projects (ADR-043) don't hold anyone back: a unit's project opens once
// the lesson before it is done, and is skipped when picking the next
// lesson, so the next unit opens alongside it.
export function lessonStates(
  orderedLessonIds: readonly string[],
  completedIds: ReadonlySet<string>,
  projectIds: ReadonlySet<string> = new Set(),
): Map<string, LessonState> {
  const states = new Map<string, LessonState>();
  let activeGiven = false;
  // Whether the last non-project lesson so far is done (true at the start).
  let lessonBeforeDone = true;

  for (const id of orderedLessonIds) {
    const done = completedIds.has(id);
    if (done) {
      states.set(id, 'completed');
    } else if (projectIds.has(id)) {
      states.set(id, lessonBeforeDone ? 'active' : 'locked');
    } else if (!activeGiven) {
      states.set(id, 'active');
      activeGiven = true;
    } else {
      states.set(id, 'locked');
    }
    if (!projectIds.has(id)) lessonBeforeDone = done;
  }
  return states;
}
