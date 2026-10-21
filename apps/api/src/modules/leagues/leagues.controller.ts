import { Controller, Get } from '@nestjs/common';
import type { LeagueResponse } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { LeaguesService } from './leagues.service.js';

// Weekly leagues (ADR-038).
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Get('current')
  current(@CurrentUser() user: AuthUser): Promise<LeagueResponse> {
    return this.leagues.current(user.id);
  }
}
