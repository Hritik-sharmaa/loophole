import type { PistonClient } from '../../../integrations/piston.client.js';
import { HealthService } from '../health.service.js';

describe('HealthService', () => {
  it.each([
    [true, 'ok'],
    [false, 'down'],
  ])('Piston up = %s reports piston "%s"', async (up, piston) => {
    const client = { isUp: () => Promise.resolve(up) } as PistonClient;

    expect(await new HealthService(client).check()).toEqual({
      status: 'ok',
      piston,
    });
  });
});
