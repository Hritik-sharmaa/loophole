import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  MeResponse,
  RatingLeaderboard,
  DuelEnd,
  DuelMatched,
  DuelOpponentStatus,
  DuelProgress,
  DuelStart,
  DuelSubmissionResult,
  QueueJoined,
  SocketError,
} from '@loophole/shared';
import { eq, notInArray } from 'drizzle-orm';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DbService, type Db } from '../src/db/db.service.js';
import { duelProblems, duels, ratings } from '../src/db/schema/index.js';
import { seedContent } from '../src/db/seed/seed-content.js';
import {
  PistonClient,
  type RunResult,
} from '../src/integrations/piston.client.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../src/integrations/supabase-auth.client.js';
import { DuelsService } from '../src/modules/duels/duels.service.js';
import { CONTENT_DIR, createTestDb, type TestDb } from './support/test-db.js';

// One pair of players per scenario, so the 3 s submit throttle and the
// "already in a duel" rule never leak between tests.
const NAMES = [
  'ana',
  'ben',
  'cal',
  'dee',
  'eve',
  'fay',
  'gus',
  'hal',
  'ivy',
  'jon',
  'kim',
  'leo',
  'max',
  'ned',
  'oli',
  'pam',
  'qin',
  'ray',
  'sam',
  'tia',
  'uma',
];
const USERS: Record<string, AuthUser> = Object.fromEntries(
  NAMES.map((name, i) => [
    name,
    {
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      email: `${name}@example.com`,
      name,
    },
  ]),
);

// Fake Piston for "Sum to N" (the only problem left in each language's
// pool):
// "fixed" is right on every test, "buggy" sums to N - 1 (passes only N = 0),
// "two" is right only for N = 0 and N = 3. "slow" is "fixed" taking 50 ms
// a run, so two players' gradings overlap and both reach the finish line.
const sumTo = (n: number) => (n * (n + 1)) / 2;
const PROGRAMS: Record<string, (n: number) => number> = {
  fixed: sumTo,
  buggy: (n) => sumTo(n - 1),
  two: (n) => (n === 0 || n === 3 ? sumTo(n) : -1),
  slow: sumTo,
};
const run = (_language: string, code: string, stdin: string) => {
  const n = Number.parseInt(stdin.trim(), 10);
  const out: RunResult = {
    stdout: `${PROGRAMS[code]?.(n) ?? ''}\n`,
    stderr: '',
    exitCode: 0,
    timedOut: false,
  };
  const delay = code === 'slow' ? 50 : 0;
  return new Promise<RunResult>((resolve) =>
    setTimeout(() => resolve(out), delay),
  );
};

// A socket.io client that records every event, so a test can wait for one
// that may already have arrived.
class Player {
  readonly events: { event: string; data: unknown }[] = [];
  private readonly unread: { event: string; data: unknown }[] = [];
  private readonly waiting: { event: string; resolve: (d: unknown) => void }[] =
    [];

  constructor(
    readonly name: string,
    readonly socket: Socket,
  ) {
    socket.onAny((event: string, data: unknown) => {
      this.events.push({ event, data });
      const i = this.waiting.findIndex((w) => w.event === event);
      if (i >= 0) this.waiting.splice(i, 1)[0].resolve(data);
      else this.unread.push({ event, data });
    });
  }

  get id(): string {
    return USERS[this.name].id;
  }

  send(event: string, data?: unknown): void {
    this.socket.emit(event, data);
  }

  next<T>(event: string, ms = 4000): Promise<T> {
    const i = this.unread.findIndex((e) => e.event === event);
    if (i >= 0) return Promise.resolve(this.unread.splice(i, 1)[0].data as T);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${this.name}: no ${event} within ${ms} ms`)),
        ms,
      );
      this.waiting.push({
        event,
        resolve: (d) => {
          clearTimeout(timer);
          resolve(d as T);
        },
      });
    });
  }

  count(event: string): number {
    return this.events.filter((e) => e.event === event).length;
  }
}

const settle = () => new Promise((r) => setTimeout(r, 300));

describe('Duels (e2e)', () => {
  let testDb: TestDb;
  let db: Db;
  let app: INestApplication<Server>;
  let url: string;
  const players: Player[] = [];
  const ratingOf = async (userId: string) => {
    const [row] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.userId, userId));
    return row;
  };
  // ana vs ben, from the matching test; reused by the next three.
  let firstDuel: string;
  const byName = (name: string) => players.find((p) => p.name === name)!;

  const connect = (name: string): Promise<Player> =>
    new Promise((resolve, reject) => {
      const socket = io(`${url}/duels`, {
        auth: { token: name },
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      const player = new Player(name, socket);
      socket.once('connect', () => {
        players.push(player);
        resolve(player);
      });
      socket.once('connect_error', reject);
    });

  // Two players queue one after the other and get matched together.
  const duelBetween = async (a: string, b: string) => {
    const [pa, pb] = [await connect(a), await connect(b)];
    pa.send('queue:join');
    expect(await pa.next<QueueJoined>('queue:joined')).toEqual({ position: 1 });
    pb.send('queue:join');
    const [ma, mb, sa, sb] = await Promise.all([
      pa.next<DuelMatched>('duel:matched'),
      pb.next<DuelMatched>('duel:matched'),
      pa.next<DuelStart>('duel:start'),
      pb.next<DuelStart>('duel:start'),
    ]);
    return { pa, pb, ma, mb, sa, sb, duelId: sa.duelId };
  };

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
    await seedContent(db, CONTENT_DIR);
    // Keep one problem per language (the same one), so every duel's tests
    // are known.
    await db
      .delete(duelProblems)
      .where(
        notInArray(duelProblems.slug, ['off-by-one-sum', 'js-off-by-one-sum']),
      );
    for (const { id } of Object.values(USERS)) {
      await db.execute(`insert into auth.users (id) values ('${id}')`);
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({ drizzle: db })
      .overrideProvider(SupabaseAuthClient)
      .useValue({
        verify: (token: string) => Promise.resolve(USERS[token] ?? null),
      })
      .overrideProvider(PistonClient)
      .useValue({ run })
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    for (const p of players) p.socket.disconnect();
    await app.close();
    await testDb.close();
  });

  it('rejects a connection without a valid token', async () => {
    const err = await connect('nobody').then(
      () => null,
      (e: Error & { data?: SocketError }) => e,
    );
    expect(err?.data).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('matches the first two in the queue on the same problem and deadline (FR-17, FR-19)', async () => {
    const { ma, mb, sa, sb, duelId } = await duelBetween('ana', 'ben');
    firstDuel = duelId;

    expect(ma.opponent.username).toBe('ben');
    expect(mb.opponent.username).toBe('ana');
    expect(sa).toEqual(sb);
    expect(sa.problem.title).toBe('Sum to N');
    // queue:join without a language (older clients) means Python.
    expect(sa.problem.language).toBe('python');
    expect(sa.problem.sampleTests).toEqual([
      { input: '3\n', expectedOutput: '6' },
    ]);
    const msLeft = new Date(sa.endsAt).getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(4.5 * 60_000);
    expect(msLeft).toBeLessThanOrEqual(5 * 60_000);

    const [row] = await db.select().from(duels).where(eq(duels.id, duelId));
    expect(row).toMatchObject({ status: 'in_progress', winnerId: null });
  });

  it('shows progress to both players, details only to the submitter (FR-20)', async () => {
    const [ana, ben] = [byName('ana'), byName('ben')];
    ana.send('duel:submit', { duelId: firstDuel, code: 'buggy' });
    const result = await ana.next<DuelSubmissionResult>('duel:result');
    expect(result).toMatchObject({ testsPassed: 1, totalTests: 5 });
    expect(result.results[0]).toEqual({
      kind: 'sample',
      passed: false,
      input: '3\n',
      expected: '6',
      actual: '3',
    });

    const progress = await ben.next<DuelProgress>('duel:progress');
    expect(progress).toEqual({ userId: ana.id, testsPassed: 1, totalTests: 5 });
    await settle();
    expect(ben.count('duel:result')).toBe(0);
  });

  it('allows one submission every 3 seconds', async () => {
    byName('ana').send('duel:submit', { duelId: firstDuel, code: 'fixed' });
    expect(await byName('ana').next<SocketError>('error')).toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('rejects a bad payload with VALIDATION_FAILED', async () => {
    const ben = byName('ben');
    ben.send('duel:submit', { duelId: 'nope', code: 1 });
    expect(await ben.next<SocketError>('error')).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('two fixes at the same moment produce exactly one winner (FR-21)', async () => {
    const { pa, pb, duelId } = await duelBetween('cal', 'dee');

    pa.send('duel:submit', { duelId, code: 'slow' });
    pb.send('duel:submit', { duelId, code: 'slow' });
    const [endA, endB] = await Promise.all([
      pa.next<DuelEnd>('duel:end'),
      pb.next<DuelEnd>('duel:end'),
    ]);
    await settle();

    expect(endA).toEqual(endB);
    expect(endA.result).toBe('win');
    expect([pa.id, pb.id]).toContain(endA.winnerId);
    expect(pa.count('duel:end')).toBe(1);
    expect(pb.count('duel:end')).toBe(1);

    // FR-24 / Gate 2: both ratings move, once. Equal 1200s: ±16.
    const winner = endA.winnerId!;
    const loser = winner === pa.id ? pb.id : pa.id;
    expect(endA.ratingChange).toEqual({ [winner]: 16, [loser]: -16 });
    expect(await ratingOf(winner)).toMatchObject({
      elo: 1216,
      wins: 1,
      losses: 0,
    });
    expect(await ratingOf(loser)).toMatchObject({
      elo: 1184,
      wins: 0,
      losses: 1,
    });

    const [row] = await db.select().from(duels).where(eq(duels.id, duelId));
    expect(row).toMatchObject({
      status: 'completed',
      result: 'win',
      winnerId: endA.winnerId,
    });
  });

  it('a submission after the end is ILLEGAL_TRANSITION', async () => {
    const cal = byName('cal');
    const duelId = (
      cal.events.find((e) => e.event === 'duel:start')!.data as DuelStart
    ).duelId;
    await new Promise((r) => setTimeout(r, 3_100)); // past the throttle

    cal.send('duel:submit', { duelId, code: 'fixed' });
    expect(await cal.next<SocketError>('error')).toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('at the deadline, most tests passed wins (FR-22)', async () => {
    const { pa, pb, duelId } = await duelBetween('eve', 'fay');
    pa.send('duel:submit', { duelId, code: 'two' }); // 2/5
    pb.send('duel:submit', { duelId, code: 'buggy' }); // 1/5
    await Promise.all([pa.next('duel:result'), pb.next('duel:result')]);

    await app.get(DuelsService).finishOnTimeout(duelId);
    const end = await pa.next<DuelEnd>('duel:end');
    expect(end).toMatchObject({
      result: 'win',
      winnerId: pa.id,
      ratingChange: { [pa.id]: 16, [pb.id]: -16 },
    });
    expect(await pb.next<DuelEnd>('duel:end')).toEqual(end);
  });

  it('at the deadline, equal scores are a draw (FR-22)', async () => {
    const { pa, pb, duelId } = await duelBetween('gus', 'hal');
    pa.send('duel:submit', { duelId, code: 'buggy' });
    pb.send('duel:submit', { duelId, code: 'buggy' });
    await Promise.all([pa.next('duel:result'), pb.next('duel:result')]);

    await app.get(DuelsService).finishOnTimeout(duelId);
    expect(await pa.next<DuelEnd>('duel:end')).toMatchObject({
      result: 'draw',
      winnerId: null,
      ratingChange: { [pa.id]: 0, [pb.id]: 0 },
    });
    expect(await ratingOf(pa.id)).toMatchObject({ elo: 1200, draws: 1 });
    // A late timer for a finished duel changes nothing.
    await app.get(DuelsService).finishOnTimeout(duelId);
    await settle();
    expect(pa.count('duel:end')).toBe(1);
  });

  it('forfeit gives the win to the opponent', async () => {
    const { pa, pb, duelId } = await duelBetween('ivy', 'jon');
    pa.send('duel:forfeit', { duelId });
    expect(await pb.next<DuelEnd>('duel:end')).toMatchObject({
      result: 'forfeit',
      winnerId: pb.id,
      ratingChange: { [pb.id]: 16, [pa.id]: -16 },
    });
  });

  it('a rematch shows the new ratings, and the higher one gains less (FR-24)', async () => {
    // cal and dee finished one duel: one is at 1216, the other at 1184.
    const calElo = (await ratingOf(USERS.cal.id)).elo;
    const deeElo = (await ratingOf(USERS.dee.id)).elo;
    await new Promise((r) => setTimeout(r, 3_100)); // past the throttle
    for (const p of players.filter((x) => ['cal', 'dee'].includes(x.name))) {
      p.socket.disconnect();
    }

    const { pa, pb, ma, duelId } = await duelBetween('cal', 'dee');
    expect(ma.opponent.elo).toBe(deeElo);
    pa.send('duel:submit', { duelId, code: 'fixed' });
    const end = await pb.next<DuelEnd>('duel:end');

    // Expected change for cal from Elo with K = 32.
    const expectedCal = Math.round(
      32 * (1 - 1 / (1 + 10 ** ((deeElo - calElo) / 400))),
    );
    expect(end.ratingChange).toEqual({
      [pa.id]: expectedCal,
      [pb.id]: -expectedCal,
    });
    expect((await ratingOf(pa.id)).elo).toBe(calElo + expectedCal);
  });

  it('GET /leaderboard/rating and /me show the ratings', async () => {
    const get = <T>(who: string, url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${who}`)
        .expect(200)
        .then((res) => res.body as T);

    const board = await get<RatingLeaderboard>('ana', '/leaderboard/rating');
    const elos = board.entries.map((e) => e.elo);
    expect(elos).toEqual([...elos].sort((x, y) => y - x));
    expect(board.entries[0]).toMatchObject({ rank: 1 });
    expect(board.entries.every((e) => e.username && e.userId)).toBe(true);

    // Players who have not finished a duel are not ranked yet.
    const fresh = await get<RatingLeaderboard>('max', '/leaderboard/rating');
    expect(fresh.me).toEqual({ rank: null, elo: 1200 });

    const eve = await get<MeResponse>('eve', '/me');
    expect(eve.rating).toBe((await ratingOf(USERS.eve.id)).elo);
  });

  it('a reload mid-duel gets the same duel back; queueing again is refused', async () => {
    const { pa, duelId } = await duelBetween('kim', 'leo');
    pa.socket.disconnect();

    const again = await connect('kim');
    expect((await again.next<DuelStart>('duel:start')).duelId).toBe(duelId);
    expect(
      (await again.next<DuelMatched>('duel:matched')).opponent.username,
    ).toBe('leo');

    again.send('queue:join');
    expect(await again.next<SocketError>('error')).toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('leaving the queue means not being matched', async () => {
    const max = await connect('max');
    max.send('queue:join');
    await max.next('queue:joined');
    max.send('queue:leave');
    await settle();

    const ned = await connect('ned');
    ned.send('queue:join');
    expect(await ned.next<QueueJoined>('queue:joined')).toEqual({
      position: 1,
    });
    await settle();
    expect(ned.count('duel:matched')).toBe(0);
    ned.send('queue:leave');
  });

  it('a player who leaves mid-duel and returns within 30 s keeps playing (FR-23)', async () => {
    const { pa, pb, duelId } = await duelBetween('oli', 'pam');
    pa.socket.disconnect();
    expect(await pb.next<DuelOpponentStatus>('duel:opponent')).toEqual({
      userId: pa.id,
      connected: false,
    });

    const back = await connect('oli');
    expect((await back.next<DuelStart>('duel:start')).duelId).toBe(duelId);
    expect(await pb.next<DuelOpponentStatus>('duel:opponent')).toEqual({
      userId: pa.id,
      connected: true,
    });

    // The 30 s timer firing late does nothing: oli is back.
    await app.get(DuelsService).forfeitIfAbsent(pa.id);
    await settle();
    expect(pb.count('duel:end')).toBe(0);
  });

  it('a player gone for 30 s forfeits; the opponent wins and gains rating (FR-23)', async () => {
    const oli = players.filter((p) => p.name === 'oli').at(-1)!;
    const pam = byName('pam');
    oli.socket.disconnect();
    await pam.next('duel:opponent');

    await app.get(DuelsService).forfeitIfAbsent(oli.id); // the timer firing
    const end = await pam.next<DuelEnd>('duel:end');
    expect(end).toMatchObject({ result: 'forfeit', winnerId: pam.id });
    expect(end.ratingChange[pam.id]).toBeGreaterThan(0);
  });

  it('players far apart in rating are not paired at once (FR-18)', async () => {
    const [qin, ray] = [await connect('qin'), await connect('ray')];
    // Profiles exist now (created on connect); give them distant ratings.
    await db.insert(ratings).values([
      { userId: qin.id, elo: 1200 },
      { userId: ray.id, elo: 1800 },
    ]);

    qin.send('queue:join');
    await qin.next('queue:joined');
    ray.send('queue:join');
    expect(await ray.next<QueueJoined>('queue:joined')).toEqual({
      position: 2,
    });
    await settle();
    // 600 apart: outside ±150 until they have waited over a minute.
    expect(qin.count('duel:matched')).toBe(0);
    expect(ray.count('duel:matched')).toBe(0);
    qin.send('queue:leave');
    ray.send('queue:leave');
  });

  // AGENTS.md hard rule 2: hidden tests never leave the server, and the
  // opponent never sees your code (FR-20).
  it('pairs only players who picked the same language, on a problem in it (ADR-040)', async () => {
    const [sam, tia, uma] = [
      await connect('sam'),
      await connect('tia'),
      await connect('uma'),
    ];
    sam.send('queue:join', { language: 'python' });
    expect(await sam.next<QueueJoined>('queue:joined')).toEqual({
      position: 1,
    });
    tia.send('queue:join', { language: 'javascript' });
    // First in the JavaScript line, though sam is waiting too.
    expect(await tia.next<QueueJoined>('queue:joined')).toEqual({
      position: 1,
    });
    await settle();
    expect(sam.count('duel:matched') + tia.count('duel:matched')).toBe(0);

    uma.send('queue:join', { language: 'javascript' });
    const [st, su] = await Promise.all([
      tia.next<DuelStart>('duel:start'),
      uma.next<DuelStart>('duel:start'),
    ]);
    expect(st).toEqual(su);
    expect(st.problem).toMatchObject({
      title: 'Sum to N',
      language: 'javascript',
    });
    expect(st.problem.buggyCode).toContain('prompt()');
    expect(sam.count('duel:matched')).toBe(0);
    sam.send('queue:leave');
  });

  it('rejects a duel language with no pool', async () => {
    const sam = byName('sam');
    sam.send('queue:join', { language: 'ruby' });
    expect(await sam.next<SocketError>('error')).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('no event ever carries hidden tests or code', () => {
    const all = players.flatMap((p) => p.events);
    expect(all.length).toBeGreaterThan(40);
    const text = JSON.stringify(all);
    expect(text).not.toMatch(/hidden_?tests/i);

    const inputs: unknown[] = [];
    const walk = (v: unknown, key?: string): void => {
      if (key === 'input') inputs.push(v);
      if (Array.isArray(v)) v.forEach((x) => walk(x));
      else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) walk(x, k);
      }
    };
    for (const e of all) {
      walk(e.data);
      if (e.event !== 'error') {
        // Any depth: no submission code in progress, results or end events.
        expect(JSON.stringify(e.data ?? {})).not.toMatch(/"code":/);
      }
    }
    // Only the one sample input was ever shown.
    expect(new Set(inputs)).toEqual(new Set(['3\n']));
  });
});
