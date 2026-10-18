import {
  Catch,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { SocketError } from '@loophole/shared';
import type { Socket } from 'socket.io';
import { toErrorBody } from './error-body.js';

// The socket version of HttpExceptionFilter: any error in a gateway
// handler is sent to that socket as an `error` event { code, message }
// (docs/API_SPEC.md "Server → client"), with the same codes as HTTP.
@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const socket = host.switchToWs().getClient<Socket>();
    const error: SocketError = toErrorBody(exception, this.logger).body.error;
    socket.emit('error', error);
  }
}
