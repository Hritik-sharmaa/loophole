import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { CorsIoAdapter } from './common/cors-io.adapter.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // On docker stop (SIGTERM), run onModuleDestroy so DbService closes the
  // pool instead of being killed mid-query.
  app.enableShutdownHooks();
  // Behind Caddy: take the client IP from X-Forwarded-For (one proxy hop),
  // or every signed-out visitor would share Caddy's IP and one throttle.
  app.set('trust proxy', 1);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  const origin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({ origin });
  // Socket.io (duels) gets the same allowed origin as REST.
  app.useWebSocketAdapter(new CorsIoAdapter(app, origin));
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
