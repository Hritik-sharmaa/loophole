import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { UsersModule } from '../users/users.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [IntegrationsModule, LessonsModule, UsersModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
