import { HealthService } from '../health.service.js';

describe('HealthService', () => {
  it('reports the API as ok', () => {
    const service = new HealthService();

    expect(service.check()).toEqual({ status: 'ok' });
  });
});
