import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { RunResponse } from '@loophole/shared';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RunCodeDto } from './dto/run-code.dto.js';
import { RunsService } from './runs.service.js';

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  // Runs code in Piston, so it is throttled like submissions: 10 per
  // minute per user, then 429 RATE_LIMITED. 200, not 201: nothing is
  // created.
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  run(
    @CurrentUser() user: AuthUser,
    @Body() dto: RunCodeDto,
  ): Promise<RunResponse> {
    return this.runs.run(user.id, dto);
  }
}
