import type { CourseOverview } from '@loophole/shared';
import { orderCourses } from '../course-order.js';

const course = (
  title: string,
  lastActivityAt: string | null,
): CourseOverview => ({
  id: title,
  slug: title.toLowerCase(),
  title,
  language: 'python',
  description: '',
  lessonCount: 10,
  completedCount: lastActivityAt ? 1 : 0,
  lastActivityAt,
});

describe('orderCourses', () => {
  it('puts the most recently worked-on course first', () => {
    const titles = orderCourses([
      course('Alpha', '2026-10-01T10:00:00.000Z'),
      course('Beta', '2026-10-05T10:00:00.000Z'),
    ]).map((c) => c.title);
    expect(titles).toEqual(['Beta', 'Alpha']);
  });

  it('puts started courses before unstarted ones, which go by title', () => {
    const titles = orderCourses([
      course('Zed', null),
      course('Git', null),
      course('Python', '2026-10-01T10:00:00.000Z'),
    ]).map((c) => c.title);
    expect(titles).toEqual(['Python', 'Git', 'Zed']);
  });

  it('does not change the list it was given', () => {
    const list = [course('B', null), course('A', null)];
    orderCourses(list);
    expect(list.map((c) => c.title)).toEqual(['B', 'A']);
  });
});
