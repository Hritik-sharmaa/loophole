import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { DuelHistoryEntry, DuelReplay } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DuelHistoryService } from './duel-history.service.js';

// Finished duels over HTTP (FR-27, ADR-041); live play stays on the
// /duels socket. Protected by the global guard.
@Controller('duels')
export class DuelsController {
  constructor(private readonly history: DuelHistoryService) {}

  @Get('history')
  list(@CurrentUser() user: AuthUser): Promise<DuelHistoryEntry[]> {
    return this.history.history(user.id);
  }

  @Get(':id/replay')
  replay(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DuelReplay> {
    return this.history.replay(user.id, id);
  }
}
