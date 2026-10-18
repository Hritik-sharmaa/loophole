import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service.js';
import { LeaderboardController } from './leaderboard.controller.js';

@Module({
  controllers: [LeaderboardController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
