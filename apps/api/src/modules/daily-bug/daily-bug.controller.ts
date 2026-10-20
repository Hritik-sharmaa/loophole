import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type {
  DailyBugBoard,
  DailyBugResult,
  DailyBugToday,
} from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DailyBugService } from './daily-bug.service.js';
import { SubmitDailyBugDto } from './dto/submit-daily-bug.dto.js';

// Bug of the day (FR-28, ADR-035). Protected by the global guard.
@Controller('bug-of-the-day')
export class DailyBugController {
  constructor(private readonly dailyBug: DailyBugService) {}

  // Today's bug; the first call of the day starts the caller's clock.
  @Get()
  today(@CurrentUser() user: AuthUser): Promise<DailyBugToday> {
    return this.dailyBug.today(user);
  }

  @Get('board')
  board(@CurrentUser() user: AuthUser): Promise<DailyBugBoard> {
    return this.dailyBug.board(user.id);
  }

  // Runs the code in Piston once per test, so it is throttled like
  // POST /submissions: 10 a minute per user (NFR-06).
  @Post('submissions')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitDailyBugDto,
  ): Promise<DailyBugResult> {
    return this.dailyBug.submit(user, dto.code);
  }
}
