import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module.js';
import { RatingsModule } from '../ratings/ratings.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [GamificationModule, RatingsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
