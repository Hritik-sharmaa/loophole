import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { BotDuel, BotDuelSubmission } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { BotDuelsService } from './bot-duels.service.js';
import { StartBotDuelDto, SubmitBotDuelDto } from './dto/bot-duel.dto.js';

// Practice duels against a guide bot (ADR-039). Protected by the global
// guard.
@Controller('bot-duels')
export class BotDuelsController {
  constructor(private readonly botDuels: BotDuelsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  start(
    @CurrentUser() user: AuthUser,
    @Body() dto: StartBotDuelDto,
  ): Promise<BotDuel> {
    return this.botDuels.start(user, dto.opponent, dto.language);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BotDuel> {
    return this.botDuels.get(user.id, id);
  }

  // Runs the code in Piston once per test, so it is throttled like
  // POST /submissions: 10 a minute per user (NFR-06).
  @Post(':id/submissions')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitBotDuelDto,
  ): Promise<BotDuelSubmission> {
    return this.botDuels.submit(user.id, id, dto.code);
  }

  @Post(':id/forfeit')
  forfeit(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BotDuel> {
    return this.botDuels.forfeit(user.id, id);
  }
}
