import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Marks a route (or a whole controller) as open to requests without a token.
// Every other route requires one, because JwtAuthGuard is global.
export const Public = () => SetMetadata(IS_PUBLIC, true);
