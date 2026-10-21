import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RatingsModule } from '../ratings/ratings.module.js';
import { UsersModule } from '../users/users.module.js';
import { DuelHistoryService } from './duel-history.service.js';
import { DuelsController } from './duels.controller.js';
import { DuelsGateway } from './duels.gateway.js';
import { DuelsService } from './duels.service.js';
import { MatchmakingService } from './matchmaking.service.js';

@Module({
  imports: [AuthModule, IntegrationsModule, UsersModule, RatingsModule],
  controllers: [DuelsController],
  providers: [
    DuelsGateway,
    DuelsService,
    MatchmakingService,
    DuelHistoryService,
  ],
})
export class DuelsModule {}
