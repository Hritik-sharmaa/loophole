import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { MeResponse } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { UsersService } from './users.service.js';

// Routes for the signed-in user's own profile. Protected by the global guard.
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.users.getMe(user);
  }

  @Patch()
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponse> {
    return this.users.updateMe(user, dto);
  }
}
