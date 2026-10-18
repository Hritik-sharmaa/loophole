import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type {
  DuelEnd,
  DuelMatched,
  DuelOpponentStatus,
  DuelProgress,
  DuelResultKind,
  DuelStart,
  DuelSubmissionResult,
  DuelSubmitRequest,
  QueueJoined,
  SocketError,
} from '@loophole/shared';
import { and, desc, eq, inArray, isNull, max, or, sql } from 'drizzle-orm';
import type { Namespace, Socket } from 'socket.io';
import { RateLimiter } from '../../common/rate-limiter.js';
import { DbService } from '../../db/db.service.js';
import {
  duelProblems,
  duelSubmissions,
  duels,
  profiles,
} from '../../db/schema/index.js';
import { PistonClient } from '../../integrations/piston.client.js';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { grade } from '../submissions/grading.js';
import { runTests } from '../submissions/run-tests.js';
import { STARTING_ELO } from '../ratings/elo.js';
import { RatingsService } from '../ratings/ratings.service.js';
import { UsersService } from '../users/users.service.js';
import {
  DISCONNECT_FORFEIT_MS,
  DUEL_DURATION_MS,
  MAX_ACTIVE_DUELS,
  SUBMIT_INTERVAL_MS,
  assertTransition,
  timeoutOutcome,
} from './duel-rules.js';
import { MatchmakingService } from './matchmaking.service.js';

type Duel = typeof duels.$inferSelect;

// Socket.io rooms: every socket of a user joins user:<id> on connect (so
// several tabs and reconnects all get their events); both players' sockets
// join duel:<id> when the duel starts.
const userRoom = (userId: string) => `user:${userId}`;
const duelRoom = (duelId: string) => `duel:${duelId}`;

// The duel rules (docs/ARCHITECTURE.md §3.2). The server alone decides who
// wins (hard rule 1): grading, the single winner and the timeout all
// happen here. DuelsGateway only passes events in.
@Injectable()
export class DuelsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DuelsService.name);
  private io: Namespace | null = null;
  // One timer per running duel; its size is the active-duel count.
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly lastSubmitAt = new Map<string, number>();
  // Queue joins and forfeits: at most 20 a minute per user (the HTTP
  // throttler does not see socket events).
  private readonly actions = new RateLimiter(20, 60_000);
  // FR-23: per user whose last socket dropped mid-duel, the forfeit timer.
  private readonly absentTimers = new Map<string, NodeJS.Timeout>();
  // Duels being created right now, so the cap holds while they start.
  private starting = 0;

  constructor(
    private readonly db: DbService,
    private readonly piston: PistonClient,
    private readonly matchmaking: MatchmakingService,
    private readonly users: UsersService,
    private readonly ratings: RatingsService,
  ) {}

  // Called once by the gateway with the /duels namespace.
  attach(io: Namespace): void {
    this.io = io;
  }

  // A restart loses timers, not duels: re-arm the ones still running.
  // Overdue ones finish right away. Not awaited, so the API still starts if
  // the database is briefly unreachable; a failure is logged.
  onApplicationBootstrap(): void {
    this.rearmTimers().catch((err: unknown) =>
      this.logger.error(`Could not re-arm duel timers: ${String(err)}`),
    );
  }

  private async rearmTimers(): Promise<void> {
    const running = await this.db.drizzle
      .select({ id: duels.id, endsAt: duels.endsAt })
      .from(duels)
      .where(eq(duels.status, 'in_progress'));
    for (const d of running) this.scheduleTimeout(d.id, d.endsAt ?? new Date());
  }

  onModuleDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const timer of this.absentTimers.values()) clearTimeout(timer);
    this.absentTimers.clear();
  }

  // ---- connections -------------------------------------------------------

  // A verified socket connected. If its user is mid-duel (a reload, a second
  // tab), it rejoins the room and gets the duel again.
  async connect(socket: Socket, user: AuthUser): Promise<void> {
    // duels.player_a / player_b point at profiles.
    await this.users.ensureProfile(user);
    await socket.join(userRoom(user.id));

    const live = await this.liveDuelOf(user.id);
    if (live?.status === 'in_progress') {
      // Back within the grace period (FR-23): no forfeit.
      clearTimeout(this.absentTimers.get(user.id));
      this.absentTimers.delete(user.id);
      await socket.join(duelRoom(live.id));
      await this.announce(live, { socket, userId: user.id });
      this.emit(duelRoom(live.id), 'duel:opponent', {
        userId: user.id,
        connected: true,
      } satisfies DuelOpponentStatus);
    }
  }

  // A socket closed. If it was the user's last one and they are mid-duel,
  // tell the opponent and start the FR-23 forfeit timer.
  async disconnect(socketId: string, userId: string): Promise<void> {
    this.matchmaking.leaveSocket(socketId);
    if (await this.isConnected(userId)) return;

    const live = await this.liveDuelOf(userId);
    if (live?.status !== 'in_progress') return;
    this.emit(duelRoom(live.id), 'duel:opponent', {
      userId,
      connected: false,
    } satisfies DuelOpponentStatus);

    clearTimeout(this.absentTimers.get(userId));
    const timer = setTimeout(() => {
      this.forfeitIfAbsent(userId).catch((err: unknown) =>
        this.logger.error(err),
      );
    }, DISCONNECT_FORFEIT_MS);
    timer.unref();
    this.absentTimers.set(userId, timer);
  }

  // The FR-23 timer. Checks again when it fires, so a player who came back
  // never loses to a stale timer. Public so tests can fire it at once.
  async forfeitIfAbsent(userId: string): Promise<void> {
    clearTimeout(this.absentTimers.get(userId));
    this.absentTimers.delete(userId);
    if (await this.isConnected(userId)) return;

    const live = await this.liveDuelOf(userId);
    if (live?.status !== 'in_progress') return;
    const opponent = userId === live.playerA ? live.playerB : live.playerA;
    await this.finish(live, 'forfeit', opponent);
  }

  // ---- queue -------------------------------------------------------------

  async joinQueue(userId: string, socketId: string): Promise<void> {
    this.limitActions(userId);
    if (await this.liveDuelOf(userId)) {
      throw new HttpException(
        { code: 'ILLEGAL_TRANSITION', message: 'You are already in a duel.' },
        HttpStatus.CONFLICT,
      );
    }
    const position = this.matchmaking.join(userId, socketId);
    this.emit(socketId, 'queue:joined', { position } satisfies QueueJoined);
    await this.matchWaiting();
  }

  leaveQueue(userId: string): void {
    this.matchmaking.leave(userId);
  }

  // Starts duels for waiting pairs while under the NFR-07 cap. Called when
  // someone joins and whenever a duel ends (a slot frees up).
  private async matchWaiting(): Promise<void> {
    while (this.timers.size + this.starting < MAX_ACTIVE_DUELS) {
      const pair = this.matchmaking.takePair();
      if (!pair) return;
      this.starting++;
      try {
        await this.start(pair[0].userId, pair[1].userId);
      } catch (err) {
        this.logger.error(err);
        const error: SocketError = {
          code: 'INTERNAL_ERROR',
          message: 'Could not start the duel. Try again.',
        };
        for (const p of pair) this.emit(userRoom(p.userId), 'error', error);
      } finally {
        this.starting--;
      }
    }
  }

  // waiting → matched → in_progress for two players (FR-17, FR-19).
  private async start(playerA: string, playerB: string): Promise<void> {
    const [problem] = await this.db.drizzle
      .select({ id: duelProblems.id })
      .from(duelProblems)
      .orderBy(sql`random()`)
      .limit(1);
    if (!problem) throw new Error('No duel problems: run the seed.');

    assertTransition('waiting', 'matched');
    const [matched] = await this.db.drizzle
      .insert(duels)
      .values({ problemId: problem.id, playerA, playerB, status: 'matched' })
      .returning();

    assertTransition('matched', 'in_progress');
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + DUEL_DURATION_MS);
    const [live] = await this.db.drizzle
      .update(duels)
      .set({ status: 'in_progress', startedAt, endsAt })
      .where(and(eq(duels.id, matched.id), eq(duels.status, 'matched')))
      .returning();

    this.room([userRoom(playerA), userRoom(playerB)]).socketsJoin(
      duelRoom(live.id),
    );
    this.scheduleTimeout(live.id, endsAt);
    await this.announce(live);
  }

  // duel:matched to each player (their opponent's name), then duel:start
  // with the problem. Sample tests only: hidden tests are never selected.
  private async announce(
    duel: Duel,
    resume?: { socket: Socket; userId: string },
  ): Promise<void> {
    const [problem] = await this.db.drizzle
      .select({
        title: duelProblems.title,
        description: duelProblems.description,
        buggyCode: duelProblems.buggyCode,
        sampleTests: duelProblems.sampleTests,
      })
      .from(duelProblems)
      .where(eq(duelProblems.id, duel.problemId));
    const players = await this.db.drizzle
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .where(inArray(profiles.id, [duel.playerA, duel.playerB]));
    const elos = await this.ratings.elosOf([duel.playerA, duel.playerB]);

    const matchedFor = (userId: string): DuelMatched => {
      const opponentId = userId === duel.playerA ? duel.playerB : duel.playerA;
      const opponent = players.find((p) => p.id === opponentId);
      return {
        duelId: duel.id,
        opponent: {
          username: opponent?.username ?? 'opponent',
          elo: elos.get(opponentId) ?? STARTING_ELO,
        },
      };
    };
    const start: DuelStart = {
      duelId: duel.id,
      problem,
      endsAt: (duel.endsAt ?? new Date()).toISOString(),
    };

    if (resume) {
      resume.socket.emit('duel:matched', matchedFor(resume.userId));
      resume.socket.emit('duel:start', start);
      return;
    }
    for (const userId of [duel.playerA, duel.playerB]) {
      this.emit(userRoom(userId), 'duel:matched', matchedFor(userId));
    }
    this.emit(duelRoom(duel.id), 'duel:start', start);
  }

  // ---- playing -----------------------------------------------------------

  // Grades a fix with the same code as lessons. The submitter gets the
  // details; the room gets only passed / total (FR-20: never the code).
  // A full pass tries to win (FR-21).
  async submit(
    userId: string,
    { duelId, code }: DuelSubmitRequest,
  ): Promise<void> {
    const now = Date.now();
    const last = this.lastSubmitAt.get(userId);
    if (last !== undefined && now - last < SUBMIT_INTERVAL_MS) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'One submission every 3 seconds.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const [row] = await this.db.drizzle
      .select({
        duel: duels,
        language: duelProblems.language,
        sampleTests: duelProblems.sampleTests,
        hiddenTests: duelProblems.hiddenTests,
      })
      .from(duels)
      .innerJoin(duelProblems, eq(duels.problemId, duelProblems.id))
      .where(eq(duels.id, duelId));
    if (!row) throw duelNotFound();
    const duel = this.playerDuel(row.duel, userId);
    // Past endsAt counts as over even before the timer has fired.
    if (duel.status !== 'in_progress' || now >= (duel.endsAt?.getTime() ?? 0)) {
      throw duelNotRunning();
    }
    this.lastSubmitAt.set(userId, now);

    const result = grade(
      await runTests(
        this.piston,
        row.language,
        code,
        row.sampleTests,
        row.hiddenTests,
      ),
    );
    await this.db.drizzle.insert(duelSubmissions).values({
      duelId,
      userId,
      code,
      testsPassed: result.testsPassed,
      totalTests: result.totalTests,
    });

    this.emit(userRoom(userId), 'duel:result', {
      testsPassed: result.testsPassed,
      totalTests: result.totalTests,
      results: result.results,
      stderr: result.stderr,
    } satisfies DuelSubmissionResult);
    this.emit(duelRoom(duelId), 'duel:progress', {
      userId,
      testsPassed: result.testsPassed,
      totalTests: result.totalTests,
    } satisfies DuelProgress);

    if (result.status === 'passed') await this.finish(duel, 'win', userId);
  }

  // Giving up hands the win to the opponent.
  async forfeit(userId: string, duelId: string): Promise<void> {
    this.limitActions(userId);
    const [row] = await this.db.drizzle
      .select()
      .from(duels)
      .where(eq(duels.id, duelId));
    const duel = this.playerDuel(row, userId);
    if (duel.status !== 'in_progress') throw duelNotRunning();
    const opponent = userId === duel.playerA ? duel.playerB : duel.playerA;
    await this.finish(duel, 'forfeit', opponent);
  }

  // The server timer at endsAt (FR-22): most tests passed wins, else a draw.
  // Public so tests can fire it without waiting five minutes.
  async finishOnTimeout(duelId: string): Promise<void> {
    this.clearTimer(duelId);
    const [duel] = await this.db.drizzle
      .select()
      .from(duels)
      .where(eq(duels.id, duelId));
    if (duel?.status !== 'in_progress') return;

    const best = await this.db.drizzle
      .select({
        userId: duelSubmissions.userId,
        best: max(duelSubmissions.testsPassed),
      })
      .from(duelSubmissions)
      .where(eq(duelSubmissions.duelId, duelId))
      .groupBy(duelSubmissions.userId);
    const bestOf = (id: string) => best.find((b) => b.userId === id)?.best ?? 0;

    const outcome = timeoutOutcome(
      { id: duel.playerA, best: bestOf(duel.playerA) },
      { id: duel.playerB, best: bestOf(duel.playerB) },
    );
    await this.finish(duel, outcome.result, outcome.winnerId);
  }

  // in_progress → completed, exactly once (FR-21, NFR-11). The conditional
  // update is the whole trick: of two racing callers, Postgres lets only
  // one change the row; the other gets no row back and does nothing.
  private async finish(
    duel: Duel,
    result: DuelResultKind,
    winnerId: string | null,
  ): Promise<void> {
    assertTransition('in_progress', 'completed');
    // Ending the duel and paying both ratings is one transaction (FR-24):
    // if either fails, neither happens.
    const ratingChange = await this.db.drizzle.transaction(async (tx) => {
      const [ended] = await tx
        .update(duels)
        .set({ status: 'completed', result, winnerId, endedAt: new Date() })
        .where(
          and(
            eq(duels.id, duel.id),
            eq(duels.status, 'in_progress'),
            isNull(duels.winnerId),
          ),
        )
        .returning({ id: duels.id });
      if (!ended) return null;

      const scoreA =
        winnerId === null ? 0.5 : winnerId === duel.playerA ? 1 : 0;
      return this.ratings.applyDuel(tx, duel.playerA, duel.playerB, scoreA);
    });
    if (!ratingChange) return;

    this.clearTimer(duel.id);
    this.lastSubmitAt.delete(duel.playerA);
    this.lastSubmitAt.delete(duel.playerB);
    this.emit(duelRoom(duel.id), 'duel:end', {
      duelId: duel.id,
      result,
      winnerId,
      ratingChange,
    } satisfies DuelEnd);
    this.room([duelRoom(duel.id)]).socketsLeave(duelRoom(duel.id));
    await this.matchWaiting();
  }

  // ---- helpers -----------------------------------------------------------

  private scheduleTimeout(duelId: string, endsAt: Date): void {
    this.clearTimer(duelId);
    const timer = setTimeout(
      () => {
        this.finishOnTimeout(duelId).catch((err: unknown) =>
          this.logger.error(err),
        );
      },
      Math.max(0, endsAt.getTime() - Date.now()),
    );
    // Never keep the process alive just for a duel timer.
    timer.unref();
    this.timers.set(duelId, timer);
  }

  private clearTimer(duelId: string): void {
    clearTimeout(this.timers.get(duelId));
    this.timers.delete(duelId);
  }

  // The user's duel that is not over yet, if any.
  private async liveDuelOf(userId: string): Promise<Duel | undefined> {
    const [duel] = await this.db.drizzle
      .select()
      .from(duels)
      .where(
        and(
          inArray(duels.status, ['matched', 'in_progress']),
          or(eq(duels.playerA, userId), eq(duels.playerB, userId)),
        ),
      )
      .orderBy(desc(duels.createdAt))
      .limit(1);
    return duel;
  }

  // Someone else's duel is "not found", like a missing one.
  private playerDuel(duel: Duel | undefined, userId: string): Duel {
    if (!duel || (duel.playerA !== userId && duel.playerB !== userId)) {
      throw duelNotFound();
    }
    return duel;
  }

  private limitActions(userId: string): void {
    if (!this.actions.hit(userId)) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Wait a minute.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // Does the user have any open socket (any tab)?
  private async isConnected(userId: string): Promise<boolean> {
    const sockets = await this.room([userRoom(userId)]).fetchSockets();
    return sockets.length > 0;
  }

  private room(rooms: string[]) {
    if (!this.io)
      throw new Error('DuelsService used before the gateway started');
    return this.io.in(rooms);
  }

  private emit(room: string, event: string, data: unknown): void {
    this.room([room]).emit(event, data);
  }
}

function duelNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'NOT_FOUND',
    message: 'Duel not found.',
  });
}

// docs/API_SPEC.md: a duel action not allowed in the duel's state.
function duelNotRunning(): HttpException {
  return new HttpException(
    { code: 'ILLEGAL_TRANSITION', message: 'This duel is not running.' },
    HttpStatus.CONFLICT,
  );
}
