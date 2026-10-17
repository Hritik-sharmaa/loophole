import type { LessonState } from '@loophole/shared';

// The one place that decides which lessons a user may open (FR-04).
// orderedLessonIds is the whole course in path order (unit position, then
// lesson position). Completed lessons stay open; the first lesson not yet
// completed is the active one; everything after it is locked.
export function lessonStates(
  orderedLessonIds: readonly string[],
  completedIds: ReadonlySet<string>,
): Map<string, LessonState> {
  const states = new Map<string, LessonState>();
  let activeGiven = false;

  for (const id of orderedLessonIds) {
    if (completedIds.has(id)) {
      states.set(id, 'completed');
    } else if (!activeGiven) {
      states.set(id, 'active');
      activeGiven = true;
    } else {
      states.set(id, 'locked');
    }
  }
  return states;
}
