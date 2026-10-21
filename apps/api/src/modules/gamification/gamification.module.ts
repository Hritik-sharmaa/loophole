import { Module } from '@nestjs/common';
import { LeaguesModule } from '../leagues/leagues.module.js';
import { GamificationService } from './gamification.service.js';
import { LeaderboardController } from './leaderboard.controller.js';

@Module({
  imports: [LeaguesModule],
  controllers: [LeaderboardController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
