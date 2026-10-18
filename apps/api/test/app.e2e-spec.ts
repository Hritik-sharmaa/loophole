import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PistonClient } from './../src/integrations/piston.client.js';
import { DuelsService } from './../src/modules/duels/duels.service.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from './../src/integrations/supabase-auth.client.js';

// No network and no database: Supabase, Piston and the duel service (which
// reads the database at startup) are stubbed, and every case below is
// decided by the guard or the validation pipe before a query runs.
describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const verify = vi.fn<(token: string) => Promise<AuthUser | null>>();
  const user: AuthUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    verify.mockReset();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify })
      .overrideProvider(PistonClient)
      .useValue({ isUp: () => Promise.resolve(true) })
      .overrideProvider(DuelsService)
      .useValue({ attach: () => undefined })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health is public and reports Piston', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', piston: 'ok' });
  });

  it('GET /me without a token returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app.getHttpServer()).get('/me').expect(401);

    expect(res.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    expect(verify).not.toHaveBeenCalled();
  });

  it('GET /me with an invalid token returns 401', async () => {
    verify.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);

    expect(res.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    expect(verify).toHaveBeenCalledWith('not-a-real-token');
  });

  it('PATCH /me with a too-short username returns 400 VALIDATION_FAILED', async () => {
    verify.mockResolvedValue(user);

    const res = await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', 'Bearer good-token')
      .send({ username: 'a' })
      .expect(400);

    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('PATCH /me with an unknown field returns 400', async () => {
    verify.mockResolvedValue(user);

    const res = await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', 'Bearer good-token')
      .send({ xp: 9999 })
      .expect(400);

    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
  });

  it('a write route allows 10 a minute per user, then 429 RATE_LIMITED', async () => {
    verify.mockResolvedValue(user);
    const patch = () =>
      request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', 'Bearer good-token')
        .send({ username: 'a' }); // invalid, so it never reaches the database

    for (let i = 0; i < 10; i++) await patch().expect(400);
    const res = await patch().expect(429);
    expect(res.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('GET /health is never throttled', async () => {
    for (let i = 0; i < 130; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
