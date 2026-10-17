import { Controller, Get, Param } from '@nestjs/common';
import type { CoursePath, CourseSummary } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { LessonsService } from './lessons.service.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  list(): Promise<CourseSummary[]> {
    return this.lessons.listCourses();
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
