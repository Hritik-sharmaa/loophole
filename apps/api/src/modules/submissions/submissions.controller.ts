import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { SubmissionResult, SubmissionSummary } from '@loophole/shared';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { ListSubmissionsDto } from './dto/list-submissions.dto.js';
import { SubmissionsService } from './submissions.service.js';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  // Each call runs user code once per test in Piston, so it is throttled:
  // 10 per minute per user (NFR-06), then 429 RATE_LIMITED.
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSubmissionDto,
  ): Promise<SubmissionResult> {
    return this.submissions.submit(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() { exerciseId }: ListSubmissionsDto,
  ): Promise<SubmissionSummary[]> {
    return this.submissions.list(user.id, exerciseId);
  }
}
