import type {
  DuelForfeitRequest,
  DuelLanguage,
  DuelSubmitRequest,
  QueueJoinRequest,
} from '@loophole/shared';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';
import { DUEL_LANGUAGES } from '../duel-rules.js';

// queue:join payload (ADR-040). Optional so older clients, which send
// nothing, still queue for Python.
export class QueueJoinDto implements QueueJoinRequest {
  @IsOptional()
  @IsIn(DUEL_LANGUAGES, { message: 'language must be python or javascript' })
  language?: DuelLanguage;
}

// duel:submit payload. Like lessons, the client sends only code: the tests
// come from the server (hard rule 2).
export class DuelSubmitDto implements DuelSubmitRequest {
  @IsUUID()
  duelId: string;

  @IsString()
  @MaxLength(CODE_MAX)
  code: string;
}

// duel:forfeit payload.
export class DuelForfeitDto implements DuelForfeitRequest {
  @IsUUID()
  duelId: string;
}
