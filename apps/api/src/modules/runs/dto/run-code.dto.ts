import type { RunRequest } from '@loophole/shared';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';

// What a learner can type as stdin for an example.
export const INPUT_MAX = 1024;

// POST /runs body: code from a Learn example, maybe edited by the learner.
// The language comes from the lesson's course, never from the client.
export class RunCodeDto implements RunRequest {
  @IsUUID()
  lessonId: string;

  @IsString()
  @MaxLength(CODE_MAX)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(INPUT_MAX)
  input?: string;
}
