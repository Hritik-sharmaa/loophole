import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthClient } from '../../integrations/supabase-auth.client.js';
import type { AuthedRequest } from './current-user.decorator.js';
import { IS_PUBLIC } from './public.decorator.js';

// Runs before every route. Lets @Public() routes through; for the rest,
// requires a valid Supabase token and attaches the user to the request.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: SupabaseAuthClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sign in to continue.',
      });
    }

    const user = await this.auth.verify(token);
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Your session has expired. Sign in again.',
      });
    }

    request.user = user;
    return true;
  }
}
