// Duel load test (ROADMAP Phase 3): two real socket clients play N duels in
// a row against a running API and check every one.
//
//   SOAK_TOKEN_A=<jwt> SOAK_TOKEN_B=<jwt> pnpm --filter @loophole/api soak:duels
//
// Optional: SOAK_URL (default http://localhost:3001), SOAK_DUELS (50).
// Use two test accounts: every duel is real and changes their ratings.
// Fixes come from content-solutions/duels/<language>/<slug>.py (git-ignored).
import type {
  DuelEnd,
  DuelProgress,
  DuelStart,
  SocketError,
} from '@loophole/shared';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io, type Socket } from 'socket.io-client';

export type SoakOptions = {
  url: string;
  tokenA: string;
  tokenB: string;
  duels: number;
  // The fixed program for a duel's problem.
  solve: (problem: DuelStart['problem']) => string;
  // Minimum time per duel. Queue joins are limited to 20 a minute per
  // user, so a long run needs about 3.5 s per duel.
  minDuelMs: number;
  log?: (line: string) => void;
};

export type SoakReport = {
  duels: number;
  ok: number;
  failures: string[];
  // Time from one player's submit to the other receiving duel:progress
  // (grading included).
  progressMs: number[];
  // Gap between the submitter's duel:result and the opponent's
  // duel:progress, i.e. delivery alone (NFR-10: under 500 ms).
  deliveryMs: number[];
};

const WAIT_MS = 15_000;

// A client that buffers events, so a wait never misses one that already
// arrived.
class Client {
  private readonly unread: { event: string; data: unknown; at: number }[] = [];
  private readonly waiting: {
    event: string;
    resolve: (e: { data: unknown; at: number }) => void;
  }[] = [];
  readonly seen: { event: string; data: unknown }[] = [];

  readonly name: string;
  readonly socket: Socket;

  // Plain fields, not constructor parameter properties: Node runs this file
  // directly and only strips types; it cannot compile TypeScript features.
  constructor(name: string, socket: Socket) {
    this.name = name;
    this.socket = socket;
    socket.onAny((event: string, data: unknown) => {
      const entry = { event, data, at: Date.now() };
      this.seen.push(entry);
      const i = this.waiting.findIndex((w) => w.event === event);
      if (i >= 0) this.waiting.splice(i, 1)[0].resolve(entry);
      else this.unread.push(entry);
    });
  }

  async next<T>(event: string): Promise<T> {
    return (await this.nextTimed<T>(event)).data;
  }

  // The event and when it arrived.
  nextTimed<T>(event: string): Promise<{ data: T; at: number }> {
    const i = this.unread.findIndex((e) => e.event === event);
    if (i >= 0) {
      const e = this.unread.splice(i, 1)[0];
      return Promise.resolve({ data: e.data as T, at: e.at });
    }
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => {
        const error = this.seen.findLast((e) => e.event === 'error');
        fail(
          new Error(
            `${this.name}: no ${event} within ${WAIT_MS} ms` +
              (error ? ` (last error: ${JSON.stringify(error.data)})` : ''),
          ),
        );
      }, WAIT_MS);
      this.waiting.push({
        event,
        resolve: (e) => {
          clearTimeout(timer);
          ok({ data: e.data as T, at: e.at });
        },
      });
    });
  }

  emit(event: string, data?: unknown): void {
    this.socket.emit(event, data);
  }

  forget(): void {
    this.unread.length = 0;
  }

  count(event: string, duelId: string): number {
    return this.seen.filter(
      (e) =>
        e.event === event && (e.data as { duelId?: string }).duelId === duelId,
    ).length;
  }
}

function connect(url: string, token: string, name: string): Promise<Client> {
  return new Promise((ok, fail) => {
    const socket = io(`${url}/duels`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    const client = new Client(name, socket);
    socket.once('connect', () => ok(client));
    socket.once('connect_error', (err: Error & { data?: SocketError }) =>
      fail(
        new Error(
          `${name} could not connect: ${err.data?.code ?? err.message}`,
        ),
      ),
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runSoak(opts: SoakOptions): Promise<SoakReport> {
  const log = opts.log ?? (() => undefined);
  const report: SoakReport = {
    duels: opts.duels,
    ok: 0,
    failures: [],
    progressMs: [],
    deliveryMs: [],
  };
  const a = await connect(opts.url, opts.tokenA, 'A');
  const b = await connect(opts.url, opts.tokenB, 'B');

  try {
    for (let n = 1; n <= opts.duels; n++) {
      const began = Date.now();
      try {
        // 1. Both queue and land in the same duel.
        a.emit('queue:join');
        await a.next('queue:joined');
        b.emit('queue:join');
        const [startA, startB] = await Promise.all([
          a.next<DuelStart>('duel:start'),
          b.next<DuelStart>('duel:start'),
        ]);
        const { duelId } = startA;
        if (startB.duelId !== duelId)
          throw new Error('players got different duels');

        // 2. B submits the buggy code unchanged; A must see B's progress.
        const sentAt = Date.now();
        b.emit('duel:submit', { duelId, code: startB.problem.buggyCode });
        const [seenByA, resultForB] = await Promise.all([
          a.nextTimed<DuelProgress>('duel:progress'),
          b.nextTimed('duel:result'),
        ]);
        report.progressMs.push(seenByA.at - sentAt);
        report.deliveryMs.push(Math.max(0, seenByA.at - resultForB.at));

        // 3. A submits the fix: exactly one end each, A wins, zero-sum Elo.
        a.emit('duel:submit', { duelId, code: opts.solve(startA.problem) });
        const ownProgress = await a.next<DuelProgress>('duel:progress');
        const [endA, endB] = await Promise.all([
          a.next<DuelEnd>('duel:end'),
          b.next<DuelEnd>('duel:end'),
        ]);
        await sleep(200); // room for a (wrong) second duel:end to arrive
        if (JSON.stringify(endA) !== JSON.stringify(endB)) {
          throw new Error('players saw different results');
        }
        if (
          a.count('duel:end', duelId) !== 1 ||
          b.count('duel:end', duelId) !== 1
        ) {
          throw new Error('duel:end arrived more than once');
        }
        if (endA.result !== 'win' || endA.winnerId !== ownProgress.userId) {
          throw new Error(`expected A to win, got ${JSON.stringify(endA)}`);
        }
        const changes = Object.values(endA.ratingChange);
        if (changes.length !== 2 || changes[0] + changes[1] !== 0) {
          throw new Error(
            `rating changes do not add up: ${JSON.stringify(endA.ratingChange)}`,
          );
        }

        report.ok++;
        log(`duel ${n}/${opts.duels} ok (progress ${seenByA.at - sentAt} ms)`);
      } catch (err) {
        report.failures.push(
          `duel ${n}: ${err instanceof Error ? err.message : String(err)}`,
        );
        log(`duel ${n}/${opts.duels} FAILED: ${report.failures.at(-1)}`);
        a.emit('queue:leave');
        b.emit('queue:leave');
      }
      a.forget();
      b.forget();
      await sleep(Math.max(0, opts.minDuelMs - (Date.now() - began)));
    }
  } finally {
    a.socket.disconnect();
    b.socket.disconnect();
  }
  return report;
}

// Fixes for the real duel pool: problem title → solution file.
function loadSolutions(repoRoot: string): Map<string, string> {
  const solutions = new Map<string, string>();
  const duelsDir = join(repoRoot, 'content/duels');
  for (const language of readdirSync(duelsDir)) {
    for (const file of readdirSync(join(duelsDir, language))) {
      if (!file.endsWith('.json')) continue;
      const { slug, title } = JSON.parse(
        readFileSync(join(duelsDir, language, file), 'utf8'),
      ) as { slug: string; title: string };
      const path = join(
        repoRoot,
        'content-solutions/duels',
        language,
        `${slug}.py`,
      );
      if (existsSync(path)) solutions.set(title, readFileSync(path, 'utf8'));
    }
  }
  return solutions;
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
    : 0;
};

async function main(): Promise<void> {
  const tokenA = process.env.SOAK_TOKEN_A;
  const tokenB = process.env.SOAK_TOKEN_B;
  if (!tokenA || !tokenB) {
    throw new Error('Set SOAK_TOKEN_A and SOAK_TOKEN_B (two test accounts).');
  }
  const solutions = loadSolutions(resolve(import.meta.dirname, '../../..'));
  const report = await runSoak({
    url: process.env.SOAK_URL ?? 'http://localhost:3001',
    tokenA,
    tokenB,
    duels: Number(process.env.SOAK_DUELS ?? 50),
    minDuelMs: 3_500,
    solve: (problem) => {
      const code = solutions.get(problem.title);
      if (!code) throw new Error(`no solution file for "${problem.title}"`);
      return code;
    },
    log: (line) => console.log(line),
  });

  console.log(
    `\n${report.ok}/${report.duels} duels ok. ` +
      `Submit → opponent progress: p50 ${percentile(report.progressMs, 0.5)} ms, ` +
      `p95 ${percentile(report.progressMs, 0.95)} ms. ` +
      `Delivery alone (NFR-10 < 500 ms): p95 ${percentile(report.deliveryMs, 0.95)} ms.`,
  );
  for (const f of report.failures) console.log(`  ✕ ${f}`);
  if (report.failures.length > 0) process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
