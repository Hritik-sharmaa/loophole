import { HttpException, HttpStatus, type Logger } from '@nestjs/common';
import type { ApiErrorBody } from '@loophole/shared';

// Used when an exception carries no code of its own (docs/API_SPEC.md).
const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

// Any thrown value → { error: { code, message } }, for HTTP responses and
// socket `error` events alike. Unknown errors become INTERNAL_ERROR and are
// logged (their details never reach the client).
export function toErrorBody(
  exception: unknown,
  logger: Logger,
): { status: number; body: ApiErrorBody } {
  if (!(exception instanceof HttpException)) {
    logger.error(exception);
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
