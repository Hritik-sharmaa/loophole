import { Injectable } from '@nestjs/common';
import { PistonClient } from '../../integrations/piston.client.js';

// docs/API_SPEC.md "Health". The API itself is "ok" if it can answer;
// `piston` says whether code can be graded right now.
export type HealthStatus = {
  status: 'ok';
  piston: 'ok' | 'down';
};

@Injectable()
export class HealthService {
  constructor(private readonly piston: PistonClient) {}

  async check(): Promise<HealthStatus> {
    return {
      status: 'ok',
      piston: (await this.piston.isUp()) ? 'ok' : 'down',
    };
  }
}
