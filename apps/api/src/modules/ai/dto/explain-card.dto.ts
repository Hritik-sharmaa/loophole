import type { ExplainCardRequest } from '@loophole/shared';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

// POST /ai/explain-card body (ADR-036): which lesson, and which of its
// Learn cards (0-based). The server reads the card itself.
export class ExplainCardDto implements ExplainCardRequest {
  @IsUUID()
  lessonId: string;

  // A lesson has at most 5 cards (CONTENT_GUIDE).
  @IsInt()
  @Min(0)
  @Max(4)
  card: number;
}
