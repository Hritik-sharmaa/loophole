import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { EnvironmentVariables } from '../config/env.validation.js';
import * as schema from './schema/index.js';

// Holds the one database connection pool for the whole API.
// Services inject this and query through `this.db.drizzle`.
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly client: postgres.Sql;
  readonly drizzle: PostgresJsDatabase<typeof schema>;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    // postgres-js connects lazily, on the first query.
    // prepare: false is required by Supabase's connection pooler.
    this.client = postgres(config.get('DATABASE_URL', { infer: true }), {
      prepare: false,
    });
    this.drizzle = drizzle(this.client, { schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }
}
