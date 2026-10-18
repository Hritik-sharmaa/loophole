import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { DuelsGateway } from './duels.gateway.js';
import { DuelsService } from './duels.service.js';
import { MatchmakingService } from './matchmaking.service.js';

@Module({
  imports: [AuthModule, IntegrationsModule, UsersModule],
  providers: [DuelsGateway, DuelsService, MatchmakingService],
})
export class DuelsModule {}
