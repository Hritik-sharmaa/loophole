import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { validateEnv } from './config/env.validation.js';
import { DbModule } from './db/db.module.js';
import type { AuthedRequest } from './modules/auth/current-user.decorator.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DuelsModule } from './modules/duels/duels.module.js';
import { GamificationModule } from './modules/gamification/gamification.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LessonsModule } from './modules/lessons/lessons.module.js';
import { RatingsModule } from './modules/ratings/ratings.module.js';
import { SubmissionsModule } from './modules/submissions/submissions.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Every HTTP route: 120 requests a minute per signed-in user (per IP
    // when signed out). Write routes set a lower limit with @Throttle.
    // HttpThrottlerGuard runs globally right after JwtAuthGuard (AuthModule),
    // so the user is known.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
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
    GamificationModule,
    AiModule,
    DuelsModule,
    RatingsModule,
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
