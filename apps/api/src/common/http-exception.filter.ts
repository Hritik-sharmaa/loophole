import {
  Catch,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { toErrorBody } from './error-body.js';

// Turns every error into { error: { code, message } }, so the web app
// handles one shape. Unknown errors become a 500 and are logged.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = toErrorBody(exception, this.logger);
    response.status(status).json(body);
  }
}
