import type { ExplainRequest } from '@loophole/shared';
import { IsUUID } from 'class-validator';

// POST /ai/explain body. Only an id: the server loads everything else.
export class ExplainDto implements ExplainRequest {
  @IsUUID()
  submissionId: string;
}
