import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { HealthService, type HealthStatus } from './health.service.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
