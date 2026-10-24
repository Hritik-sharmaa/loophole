import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { SocketError } from '@loophole/shared';
import type { Namespace, Socket } from 'socket.io';
import { WsExceptionFilter } from '../../common/ws-exception.filter.js';
import {
  SupabaseAuthClient,
  type AuthUser,
} from '../../integrations/supabase-auth.client.js';
import {
  DuelForfeitDto,
  DuelSubmitDto,
  QueueJoinDto,
} from './dto/duel-events.dto.js';
import { DuelsService } from './duels.service.js';

type SocketData = { user: AuthUser };

// Socket.io namespace /duels (docs/API_SPEC.md). Thin, like a controller:
// check the token on connect, validate each payload, call DuelsService.
// Errors reach the socket as `error` events via WsExceptionFilter.
@WebSocketGateway({ namespace: '/duels' })
@UseFilters(WsExceptionFilter)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class DuelsGateway
  implements OnGatewayInit<Namespace>, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DuelsGateway.name);

  constructor(
    private readonly auth: SupabaseAuthClient,
    private readonly duels: DuelsService,
  ) {}

  afterInit(io: Namespace): void {
    this.duels.attach(io);
    // Runs before a connection exists: a bad token never connects, and the
    // client gets connect_error with data { code, message }.
    io.use((socket, next) => {
      const token: unknown = (socket.handshake.auth as { token?: unknown })
        .token;
      const verify =
        typeof token === 'string' && token
          ? this.auth.verify(token)
          : Promise.resolve(null);
      verify
        .then(async (user) => {
          if (!user) return next(unauthenticated());
          if (!(await this.duels.canConnect(user.id))) {
            return next(tooManyTabs());
          }
          (socket.data as SocketData).user = user;
          next();
        })
        .catch(() => next(unauthenticated()));
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    // The token is checked once, at connect; once it expires, the next
    // event closes the socket. The client reconnects with a fresh token,
    // or can't, if the user signed out.
    socket.use((_event, next) => {
      const { expiresAt } = userOf(socket);
      if (expiresAt !== undefined && Date.now() >= expiresAt) {
        socket.disconnect(true);
        return;
      }
      next();
    });
    try {
      await this.duels.connect(socket, userOf(socket));
    } catch (err) {
      this.logger.error(err);
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong.',
      } satisfies SocketError);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.duels
      .disconnect(socket.id, userOf(socket).id)
      .catch((err: unknown) => this.logger.error(err));
  }

  @SubscribeMessage('queue:join')
  async joinQueue(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { language = 'python' }: QueueJoinDto,
  ): Promise<void> {
    await this.duels.joinQueue(userOf(socket).id, socket.id, language);
  }

  @SubscribeMessage('queue:leave')
  leaveQueue(@ConnectedSocket() socket: Socket): void {
    this.duels.leaveQueue(userOf(socket).id);
  }

  @SubscribeMessage('duel:submit')
  async submit(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: DuelSubmitDto,
  ): Promise<void> {
    await this.duels.submit(userOf(socket).id, dto);
  }

  @SubscribeMessage('duel:forfeit')
  async forfeit(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { duelId }: DuelForfeitDto,
  ): Promise<void> {
    await this.duels.forfeit(userOf(socket).id, duelId);
  }
}

function userOf(socket: Socket): AuthUser {
  return (socket.data as SocketData).user;
}

function unauthenticated(): Error & { data: SocketError } {
  return Object.assign(new Error('UNAUTHENTICATED'), {
    data: { code: 'UNAUTHENTICATED', message: 'Sign in to duel.' },
  });
}

function tooManyTabs(): Error & { data: SocketError } {
  return Object.assign(new Error('RATE_LIMITED'), {
    data: {
      code: 'RATE_LIMITED',
      message: 'Too many duel tabs open. Close one and try again.',
    },
  });
}
