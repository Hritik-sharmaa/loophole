import { Controller, Get, Param } from '@nestjs/common';
import type { CourseOverview, CoursePath } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { LessonsService } from './lessons.service.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly lessons: LessonsService) {}

  // The course catalog with the signed-in user's progress (ADR-023).
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<CourseOverview[]> {
    return this.lessons.listCourses(user.id);
  }

  // The lesson path with each lesson's state for the signed-in user.
  @Get(':slug/path')
  path(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<CoursePath> {
    return this.lessons.getPath(user.id, slug);
  }
}
