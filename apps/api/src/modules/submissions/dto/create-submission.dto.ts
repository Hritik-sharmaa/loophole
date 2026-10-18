import type { CreateSubmissionRequest } from '@loophole/shared';
import { IsString, IsUUID, MaxLength } from 'class-validator';

// docs/DATA_MODEL.md: code is at most 20 KB. Counted in characters, which
// equals bytes for the ASCII that Python exercises use.
export const CODE_MAX = 20 * 1024;

// POST /submissions body. ValidationPipe rejects any other field with 400,
// so a client can't send its own test cases (FR-06).
export class CreateSubmissionDto implements CreateSubmissionRequest {
  @IsUUID()
  exerciseId: string;

  @IsString()
  @MaxLength(CODE_MAX)
  code: string;
}
