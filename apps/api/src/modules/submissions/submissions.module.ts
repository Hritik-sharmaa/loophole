import { Module } from '@nestjs/common';
import { PistonClient } from '../../integrations/piston.client.js';
import { GamificationModule } from '../gamification/gamification.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { UsersModule } from '../users/users.module.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [LessonsModule, UsersModule, GamificationModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PistonClient],
})
export class SubmissionsModule {}
