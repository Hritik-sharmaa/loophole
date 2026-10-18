import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // On docker stop (SIGTERM), run onModuleDestroy so DbService closes the
  // pool instead of being killed mid-query.
  app.enableShutdownHooks();
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
