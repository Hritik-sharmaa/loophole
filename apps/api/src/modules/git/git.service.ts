import { BadRequestException, Injectable } from '@nestjs/common';
import type { GitRunResponse } from '@loophole/shared';
import { exerciseKind } from '../../common/exercise-kind.js';
import { LessonsService } from '../lessons/lessons.service.js';
import type { GitRunDto } from './dto/git-run.dto.js';
import { replay } from './git-checks.js';

// The practice terminal behind git lessons (ADR-026). Ungraded and
// stateless: every call replays the lesson's hidden setup and then all the
// commands typed so far, so nothing is stored between keystrokes.
@Injectable()
export class GitService {
  constructor(private readonly lessons: LessonsService) {}

  async run(
    userId: string,
    { lessonId, commands, fresh }: GitRunDto,
  ): Promise<GitRunResponse> {
    const { language, scenario } = await this.lessons.gitLessonOf(
      userId,
      lessonId,
    );
    if (exerciseKind(language) !== 'git') {
      throw new BadRequestException({
        code: 'NOT_A_GIT_LESSON',
        message: 'This lesson has no terminal.',
      });
    }
    const { transcript, cwd } = replay(fresh ? null : scenario, commands);
    return { transcript, cwd };
  }
}
