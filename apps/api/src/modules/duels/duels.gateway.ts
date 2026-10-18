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
import { DuelForfeitDto, DuelSubmitDto } from './dto/duel-events.dto.js';
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
      verify.then(
        (user) => {
          if (!user) return next(unauthenticated());
          (socket.data as SocketData).user = user;
          next();
        },
        () => next(unauthenticated()),
      );
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
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
    this.duels.disconnect(socket.id);
  }

  @SubscribeMessage('queue:join')
  async joinQueue(@ConnectedSocket() socket: Socket): Promise<void> {
    await this.duels.joinQueue(userOf(socket).id, socket.id);
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
