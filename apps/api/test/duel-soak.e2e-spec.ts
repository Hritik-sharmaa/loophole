import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, ne } from 'drizzle-orm';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { duelProblems, ratings } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { runSoak } from '../scripts/duel-soak.js';
import { CONTENT_DIR, createTestDb, type TestDb } from './support/test-db.js';

const USERS: Record<string, AuthUser> = {
  botA: {
    id: '56565656-5656-4565-8565-565656565656',
    email: 'a@example.com',
    name: 'Bot A',
  },
  botB: {
    id: '78787878-7878-4787-8787-787878787878',
    email: 'b@example.com',
    name: 'Bot B',
  },
};

// The load-test script itself, run against the real gateway (PGlite,
// stubbed Piston): proves the script and the duel flow agree.
describe('duel-soak script (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<Server>;
  let url: string;

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    await db
      .delete(duelProblems)
      .where(ne(duelProblems.slug, 'off-by-one-sum'));
    for (const { id } of Object.values(USERS)) {
      await db.execute(`insert into auth.users (id) values ('${id}')`);
    }

    // "fixed" sums 1..N correctly; anything else (the buggy code) prints nothing.
    const run = (_lang: string, code: string, stdin: string) => {
      const n = Number.parseInt(stdin.trim(), 10);
      const out: RunResult = {
        stdout: code === 'fixed' ? `${(n * (n + 1)) / 2}\n` : '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
      return Promise.resolve(out);
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({ verify: (t: string) => Promise.resolve(USERS[t] ?? null) })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    url = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
    await testDb.close();
  });

  it('plays 5 duels in a row, each with one result and zero-sum ratings', async () => {
    const report = await runSoak({
      url,
      tokenA: 'botA',
      tokenB: 'botB',
      duels: 5,
      minDuelMs: 0,
      solve: () => 'fixed',
    });

    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(5);
    expect(report.progressMs).toHaveLength(5);
    // NFR-10 on a local stack: delivery well under 500 ms.
    expect(Math.max(...report.deliveryMs)).toBeLessThan(500);

    // A won all five: its rating went up, B's went down by the same.
    const [a] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.userId, USERS.botA.id));
    const [b] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.userId, USERS.botB.id));
    expect(a).toMatchObject({ wins: 5, losses: 0 });
    expect(b).toMatchObject({ wins: 0, losses: 5 });
    expect(a.elo - 1200).toBe(1200 - b.elo);
  });
});
