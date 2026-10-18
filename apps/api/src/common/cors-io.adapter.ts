import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

// Socket.io with the same CORS origin as the REST API (CORS_ORIGIN), read
// at startup. Gateway decorators are fixed at build time, so the origin is
// applied here instead. (apps/api pins socket.io to the exact version
// @nestjs/platform-socket.io uses, so these types are the adapter's own.)
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origin: string,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    // socket.io types every option as required; at runtime any subset is
    // fine, and Nest itself passes a partial object here.
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin },
    } as ServerOptions);
  }
}
