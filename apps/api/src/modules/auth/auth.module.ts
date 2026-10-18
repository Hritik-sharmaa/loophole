import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpThrottlerGuard } from '../../common/http-throttler.guard.js';
import { SupabaseAuthClient } from '../../integrations/supabase-auth.client.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  providers: [
    SupabaseAuthClient,
    // APP_GUARD makes these run on every route, in this order: who you are,
    // then how many requests you have left.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
  // For DuelsGateway, which checks socket tokens itself.
  exports: [SupabaseAuthClient],
})
export class AuthModule {}
