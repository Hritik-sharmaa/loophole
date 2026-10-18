import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// ThrottlerGuard for HTTP only. As a global guard it would also run on
// socket events, where it can't read a request or set headers; sockets
// have their own limits in DuelsService.
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    return Promise.resolve(context.getType() !== 'http');
  }
}
