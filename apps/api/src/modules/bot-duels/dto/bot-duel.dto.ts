import type {
  BotDuelSubmitRequest,
  BotOpponent,
  StartBotDuelRequest,
} from '@loophole/shared';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';
import { BOT_OPPONENTS } from '../bot-duel-rules.js';

// POST /bot-duels body: which crew member to race.
export class StartBotDuelDto implements StartBotDuelRequest {
  @IsIn(BOT_OPPONENTS, {
    message: 'opponent must be meera, arjun or harpreet',
  })
  opponent: BotOpponent;
}

// POST /bot-duels/:id/submissions body. Only code: the server knows the
// problem and its tests (hard rule 2).
export class SubmitBotDuelDto implements BotDuelSubmitRequest {
  @IsString()
  @MaxLength(CODE_MAX)
  code: string;
}
