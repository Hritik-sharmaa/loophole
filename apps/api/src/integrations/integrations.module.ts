import { Module } from '@nestjs/common';
import { GeminiClient } from './gemini.client.js';
import { PistonClient } from './piston.client.js';

// One instance of each outside-system client for the whole API. This
// matters for PistonClient: its run queue only works if every caller
// (submissions, health, duels later) shares the same instance (ADR-018).
@Module({
  providers: [PistonClient, GeminiClient],
  exports: [PistonClient, GeminiClient],
})
export class IntegrationsModule {}
