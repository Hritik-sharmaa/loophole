import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { GitRunResponse } from '@loophole/shared';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { GitRunDto } from './dto/git-run.dto.js';
import { GitService } from './git.service.js';

@Controller('git')
export class GitController {
  constructor(private readonly git: GitService) {}

  // Called on every Enter in the terminal. Pure computation (no Piston),
  // so it allows 60 a minute per user rather than the 10 of /runs.
  @Post('run')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  run(
    @CurrentUser() user: AuthUser,
    @Body() dto: GitRunDto,
  ): Promise<GitRunResponse> {
    return this.git.run(user.id, dto);
  }
}
