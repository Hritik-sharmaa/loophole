import type { DailyBugSubmitRequest } from '@loophole/shared';
import { IsString, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';

// POST /bug-of-the-day/submissions body. ValidationPipe rejects any other
// field with 400: the server knows which bug and which tests.
export class SubmitDailyBugDto implements DailyBugSubmitRequest {
  @IsString()
  @MaxLength(CODE_MAX)
  code: string;
}
