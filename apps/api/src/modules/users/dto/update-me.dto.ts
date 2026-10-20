import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import type { DailyGoal, UpdateMeRequest } from '@loophole/shared';
import { USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from '../username.js';

// PATCH /me body. ValidationPipe rejects unknown fields and bad values with 400.
export class UpdateMeDto implements UpdateMeRequest {
  @IsOptional()
  @IsString()
  @Length(USERNAME_MIN, USERNAME_MAX)
  @Matches(USERNAME_PATTERN, {
    message: 'username may only use lowercase letters, digits and _',
  })
  username?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  avatarUrl?: string;

  // ADR-033: about one, two or three lessons a day.
  @IsOptional()
  @IsIn([10, 20, 30], { message: 'dailyGoal must be 10, 20 or 30' })
  dailyGoal?: DailyGoal;
}
