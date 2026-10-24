import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { HealthService, type HealthStatus } from './health.service.js';

// Docker and uptime checks call this. Throttled like every route (120 a
// minute per IP): each call asks Piston, so it must not be free to flood.
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
