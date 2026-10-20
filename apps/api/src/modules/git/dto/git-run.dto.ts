import type { GitRunRequest } from '@loophole/shared';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CODE_MAX } from '../../submissions/dto/create-submission.dto.js';

// POST /git/run body: every command typed so far, one per line.
export class GitRunDto implements GitRunRequest {
  @IsUUID()
  lessonId: string;

  @IsString()
  @MaxLength(CODE_MAX)
  commands: string;

  // Start from an empty folder (a Learn example), not the exercise setup.
  @IsOptional()
  @IsBoolean()
  fresh?: boolean;
}
