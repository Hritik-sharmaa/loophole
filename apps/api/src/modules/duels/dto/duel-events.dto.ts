import type { DuelForfeitRequest, DuelSubmitRequest } from '@loophole/shared';
import { IsString, IsUUID, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';

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
