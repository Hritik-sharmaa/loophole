import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { GamificationModule } from '../gamification/gamification.module.js';
import { UsersModule } from '../users/users.module.js';
import { DailyBugController } from './daily-bug.controller.js';
import { DailyBugService } from './daily-bug.service.js';

// Bug of the day (FR-28, ADR-035).
@Module({
  imports: [IntegrationsModule, UsersModule, GamificationModule],
  controllers: [DailyBugController],
  providers: [DailyBugService],
})
export class DailyBugModule {}
