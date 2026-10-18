import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { EnvironmentVariables } from '../config/env.validation.js';
import * as schema from './schema/index.js';

// Any Drizzle Postgres database with our schema: postgres-js in the app,
// PGlite in tests (test/support/test-db.ts). Services only use this type.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Holds the one database connection pool for the whole API.
// Services inject this and query through `this.db.drizzle`.
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly client: postgres.Sql;
  readonly drizzle: Db;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    // postgres-js connects lazily, on the first query.
    // prepare: false is required by Supabase's connection pooler.
    this.client = postgres(config.get('DATABASE_URL', { infer: true }), {
      prepare: false,
    });
    this.drizzle = drizzle(this.client, { schema });
  }

  // At most 5 s to finish open queries; without a limit, end() can wait
  // forever on a connection attempt that never completes.
  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
