import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ApiErrorBody } from '@loophole/shared';
import type { Response } from 'express';

// Used when an exception carries no code of its own (docs/API_SPEC.md).
const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

// Turns every error into { error: { code, message } }, so the web app
// handles one shape. Unknown errors become a 500 and are logged.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toBody(exception);
    response.status(status).json(body);
  }

  private toBody(exception: unknown): { status: number; body: ApiErrorBody } {
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
        },
      };
    }

    const status = exception.getStatus();
    // Either our own { code, message } or Nest's { message, error, statusCode }.
    // ValidationPipe puts a list of problems in `message`.
    const raw = exception.getResponse();
    const details: { code?: unknown; message?: unknown } =
      typeof raw === 'object' ? raw : { message: raw };

    const code =
      typeof details.code === 'string'
        ? details.code
        : (CODE_BY_STATUS[status] ?? 'ERROR');
    const message = Array.isArray(details.message)
      ? details.message.join('; ')
      : typeof details.message === 'string'
        ? details.message
        : exception.message;

    return { status, body: { error: { code, message } } };
  }
}
