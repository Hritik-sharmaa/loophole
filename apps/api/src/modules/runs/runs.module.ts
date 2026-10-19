import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { RunsController } from './runs.controller.js';
import { RunsService } from './runs.service.js';

// POST /runs: ungraded runs for the Learn step's examples (ADR-021).
@Module({
  imports: [IntegrationsModule, LessonsModule],
  controllers: [RunsController],
  providers: [RunsService],
})
export class RunsModule {}
