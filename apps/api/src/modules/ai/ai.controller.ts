import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { ExplainResponse, HintResponse } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AiService } from './ai.service.js';
import { ExplainDto } from './dto/explain.dto.js';
import { HintDto } from './dto/hint.dto.js';

// The AI tutor (docs/AI_TUTOR.md). Both routes count toward the daily cap:
// 429 DAILY_LIMIT_REACHED once it is used up, 502 AI_UNAVAILABLE if Gemini
// fails (that request is not counted).
// On top of the daily cap, at most 10 a minute per user, so a script can't
// burn the whole day's cap (and Gemini quota) in a second.
@Controller('ai')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AiController {
  constructor(private readonly ai: AiService) {}

  // 200, not 201: nothing is created.
  @Post('explain')
  @HttpCode(200)
  explain(
    @CurrentUser() user: AuthUser,
    @Body() { submissionId }: ExplainDto,
  ): Promise<ExplainResponse> {
    return this.ai.explain(user, submissionId);
  }

  @Post('hint')
  @HttpCode(200)
  hint(
    @CurrentUser() user: AuthUser,
    @Body() dto: HintDto,
  ): Promise<HintResponse> {
    return this.ai.hint(user, dto);
  }
}
