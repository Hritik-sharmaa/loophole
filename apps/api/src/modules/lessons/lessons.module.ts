import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { LessonsController } from './lessons.controller.js';
import { LessonsService } from './lessons.service.js';

@Module({
  controllers: [CoursesController, LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
