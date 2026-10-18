import { Module } from '@nestjs/common';
import { GeminiClient } from '../../integrations/gemini.client.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { UsersModule } from '../users/users.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [LessonsModule, UsersModule],
  controllers: [AiController],
  providers: [AiService, GeminiClient],
})
export class AiModule {}
