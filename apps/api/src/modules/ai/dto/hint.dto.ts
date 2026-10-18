import type { HintRequest } from '@loophole/shared';
import { IsString, IsUUID, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';

// POST /ai/hint body: the code currently in the editor.
export class HintDto implements HintRequest {
  @IsUUID()
  exerciseId: string;

  // Same 20 KB limit as a submission (docs/AI_TUTOR.md §5).
  @IsString()
  @MaxLength(CODE_MAX)
  code: string;
}
