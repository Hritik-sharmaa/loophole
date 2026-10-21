import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { UsersModule } from '../users/users.module.js';
import { BotDuelsController } from './bot-duels.controller.js';
import { BotDuelsService } from './bot-duels.service.js';

// Practice duels against a guide bot (ADR-039).
@Module({
  imports: [IntegrationsModule, UsersModule],
  controllers: [BotDuelsController],
  providers: [BotDuelsService],
})
export class BotDuelsModule {}
