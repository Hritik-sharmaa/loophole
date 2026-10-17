import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service.js';

// Global, so any feature module can inject DbService without importing this.
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
