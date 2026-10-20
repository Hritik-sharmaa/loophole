import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type {
  CourseOverview,
  CoursePath,
  UnitBugHunt,
  UnitCheatSheet,
} from '@loophole/shared';
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

  // One unit's Learn cards on a single page (ADR-030).
  @Get(':slug/units/:unitId/cheatsheet')
  cheatSheet(
    @Param('slug') slug: string,
    @Param('unitId', new ParseUUIDPipe()) unitId: string,
  ): Promise<UnitCheatSheet> {
    return this.lessons.getCheatSheet(slug, unitId);
  }

  // One unit's spot-the-bug cards, for its Bug hunt review (ADR-031).
  @Get(':slug/units/:unitId/bug-hunt')
  bugHunt(
    @Param('slug') slug: string,
    @Param('unitId', new ParseUUIDPipe()) unitId: string,
  ): Promise<UnitBugHunt> {
    return this.lessons.getBugHunt(slug, unitId);
  }
}
