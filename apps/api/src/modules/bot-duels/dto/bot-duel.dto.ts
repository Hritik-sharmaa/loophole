import type {
  BotDuelSubmitRequest,
  BotOpponent,
  DuelLanguage,
  StartBotDuelRequest,
} from '@loophole/shared';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';
import { DUEL_LANGUAGES } from '../../duels/duel-rules.js';
import { BOT_OPPONENTS } from '../bot-duel-rules.js';

// POST /bot-duels body: which crew member to race, in which language.
export class StartBotDuelDto implements StartBotDuelRequest {
  @IsIn(BOT_OPPONENTS, {
    message: 'opponent must be meera, arjun or harpreet',
  })
  opponent: BotOpponent;

  @IsIn(DUEL_LANGUAGES, { message: 'language must be python or javascript' })
  language: DuelLanguage;
}

// POST /bot-duels/:id/submissions body. Only code: the server knows the
// problem and its tests (hard rule 2).
export class SubmitBotDuelDto implements BotDuelSubmitRequest {
  @IsString()
  @MaxLength(CODE_MAX)
  code: string;
}
