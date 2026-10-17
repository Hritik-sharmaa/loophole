import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { LessonDetail } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { LessonsService } from './lessons.service.js';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  // 403 LESSON_LOCKED if the user hasn't reached this lesson yet.
  // ParseUUIDPipe turns a malformed id into a 400 instead of a database error.
  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LessonDetail> {
    return this.lessons.getLesson(user.id, id);
  }
}
