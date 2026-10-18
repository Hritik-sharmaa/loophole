import { Controller, Get, Query } from '@nestjs/common';
import type { WeeklyLeaderboard } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto.js';
import { GamificationService } from './gamification.service.js';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('weekly')
  weekly(
    @CurrentUser() user: AuthUser,
    @Query() { limit }: LeaderboardQueryDto,
  ): Promise<WeeklyLeaderboard> {
    return this.gamification.weekly(user.id, limit);
  }
}
