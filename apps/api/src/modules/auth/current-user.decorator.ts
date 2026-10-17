import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';

// The request after JwtAuthGuard has attached the verified user.
export type AuthedRequest = Request & { user: AuthUser };

// `@CurrentUser() user: AuthUser` in a controller method.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
