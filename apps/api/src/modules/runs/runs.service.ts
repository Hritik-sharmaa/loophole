import { BadRequestException, Injectable } from '@nestjs/common';
import type { RunResponse } from '@loophole/shared';
import { exerciseKind } from '../../common/exercise-kind.js';
import { PistonClient } from '../../integrations/piston.client.js';
import { LessonsService } from '../lessons/lessons.service.js';
import { STDERR_MAX, TIMEOUT_MESSAGE } from '../submissions/grading.js';
import type { RunCodeDto } from './dto/run-code.dto.js';

// Runs a Learn example once, ungraded (ADR-021). Nothing is stored and no
// XP is paid, so there is nothing for a client to cheat; the lesson must
// still be unlocked, and the language comes from its course.
@Injectable()
export class RunsService {
  constructor(
    private readonly piston: PistonClient,
    private readonly lessons: LessonsService,
  ) {}

  async run(
    userId: string,
    { lessonId, code, input }: RunCodeDto,
  ): Promise<RunResponse> {
    const language = await this.lessons.languageOf(userId, lessonId);
    // Web examples render in the browser's preview; there is nothing to run.
    if (exerciseKind(language) === 'web') {
      throw new BadRequestException({
        code: 'NOT_RUNNABLE',
        message: 'This lesson shows a live preview instead of running code.',
      });
    }
    const run = await this.piston.run(language, code, input ?? '');

    return {
      stdout: run.stdout.slice(0, STDERR_MAX),
      stderr: (run.stderr || (run.timedOut ? TIMEOUT_MESSAGE : '')).slice(
        0,
        STDERR_MAX,
      ),
      timedOut: run.timedOut,
    };
  }
}
