import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseAuthClient } from '../../integrations/supabase-auth.client.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  providers: [
    SupabaseAuthClient,
    // APP_GUARD makes JwtAuthGuard run on every route in the app.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
