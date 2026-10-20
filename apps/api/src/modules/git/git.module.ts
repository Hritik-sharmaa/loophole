import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module.js';
import { GitController } from './git.controller.js';
import { GitService } from './git.service.js';

// POST /git/run: the practice terminal for git lessons (ADR-026). Grading
// of git exercises happens in SubmissionsService through gradeGit().
@Module({
  imports: [LessonsModule],
  controllers: [GitController],
  providers: [GitService],
})
export class GitModule {}
