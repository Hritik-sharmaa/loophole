'use client';

import type {
  CourseOverview,
  CoursePath,
  LessonDetail,
} from '@loophole/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../api';

// Pass enabled: false while signed out so nothing fires without a token.

// The course catalog with the user's progress, most recent course first.
export function useCourses(enabled: boolean) {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiFetch<CourseOverview[]>('/courses'),
    enabled,
  });
}

export function useCoursePath(slug: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['course-path', slug],
    queryFn: () =>
      apiFetch<CoursePath>(`/courses/${encodeURIComponent(slug ?? '')}/path`),
    enabled: enabled && !!slug,
    // An unknown course won't appear on retry.
    retry: (failures, error) =>
      !(error instanceof ApiError && error.status < 500) && failures < 1,
  });
}

export function useLesson(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: () => apiFetch<LessonDetail>(`/lessons/${id}`),
    enabled,
    // A locked or missing lesson won't change on retry.
    retry: (failures, error) =>
      !(error instanceof ApiError && error.status < 500) && failures < 1,
  });
}
