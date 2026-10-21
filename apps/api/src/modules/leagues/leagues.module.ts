import { Module } from '@nestjs/common';
import { LeaguesController } from './leagues.controller.js';
import { LeaguesService } from './leagues.service.js';

// Weekly leagues (ADR-038). GamificationModule imports it to place a
// learner in a group when XP is paid.
@Module({
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
