import { Controller, Get, Query } from '@nestjs/common';
import type { RatingLeaderboard } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { LeaderboardQueryDto } from '../gamification/dto/leaderboard-query.dto.js';
import { RatingsService } from './ratings.service.js';

// Sits next to /leaderboard/weekly (GamificationModule) under the same path.
@Controller('leaderboard')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get('rating')
  rating(
    @CurrentUser() user: AuthUser,
    @Query() { limit }: LeaderboardQueryDto,
  ): Promise<RatingLeaderboard> {
    return this.ratings.leaderboard(user.id, limit);
  }
}
