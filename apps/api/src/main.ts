import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { CorsIoAdapter } from './common/cors-io.adapter.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // On docker stop (SIGTERM), run onModuleDestroy so DbService closes the
  // pool instead of being killed mid-query.
  app.enableShutdownHooks();
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  const origin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({ origin });
  // Socket.io (duels) gets the same allowed origin as REST.
  app.useWebSocketAdapter(new CorsIoAdapter(app, origin));
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
