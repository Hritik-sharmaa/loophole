import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { validateEnv } from './config/env.validation.js';
import { DbModule } from './db/db.module.js';
import type { AuthedRequest } from './modules/auth/current-user.decorator.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LessonsModule } from './modules/lessons/lessons.module.js';
import { SubmissionsModule } from './modules/submissions/submissions.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Only routes with @UseGuards(ThrottlerGuard) are throttled; each sets
    // its own limit with @Throttle. Counted per signed-in user, not per IP
    // (JwtAuthGuard runs first and attaches the user).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 10 }],
      getTracker: (req) =>
        (req as Partial<AuthedRequest>).user?.id ??
        (req as Partial<AuthedRequest>).ip ??
        'unknown',
      errorMessage: 'Too many requests. Wait a minute and try again.',
    }),
    DbModule,
    AuthModule,
    HealthModule,
    UsersModule,
    LessonsModule,
    SubmissionsModule,
  ],
  // Registered here rather than in main.ts so e2e tests get them too.
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
