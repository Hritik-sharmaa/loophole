import { IsUUID } from 'class-validator';

// GET /submissions?exerciseId=
export class ListSubmissionsDto {
  @IsUUID()
  exerciseId: string;
}
