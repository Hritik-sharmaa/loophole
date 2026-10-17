import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EnvironmentVariables } from '../config/env.validation.js';

// Who is making the request, taken from a verified Supabase access token.
export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
};

// The only file in the API that talks to Supabase Auth (AGENTS.md rule 5).
@Injectable()
export class SupabaseAuthClient {
  private readonly logger = new Logger(SupabaseAuthClient.name);
  private readonly auth: SupabaseClient['auth'];

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    // A server never keeps a session of its own; it only checks tokens.
    this.auth = createClient(
      config.get('SUPABASE_URL', { infer: true }),
      config.get('SUPABASE_SERVICE_KEY', { infer: true }),
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).auth;
  }

  // Returns the user for a valid, unexpired token, or null for anything else.
  // getClaims checks the signature locally against Supabase's public keys
  // (cached), so most requests make no network call.
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.auth.getClaims(token);
      if (error || !data || data.claims.role !== 'authenticated') return null;

      const { sub, email } = data.claims;
      const metadata: Record<string, unknown> = data.claims.user_metadata ?? {};
      const name = metadata.full_name ?? metadata.name;

      return {
        id: sub,
        email: email ?? null,
        name: typeof name === 'string' ? name : null,
      };
    } catch (err) {
      // Never log the token itself (CODING_STANDARDS §3).
      this.logger.warn(`Token check failed: ${String(err)}`);
      return null;
    }
  }
}
