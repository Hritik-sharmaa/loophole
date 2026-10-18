import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { GamificationModule } from '../gamification/gamification.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { UsersModule } from '../users/users.module.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [IntegrationsModule, LessonsModule, UsersModule, GamificationModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
