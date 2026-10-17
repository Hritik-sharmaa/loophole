import { ConflictException, Injectable } from '@nestjs/common';
import type { MeResponse } from '@loophole/shared';
import { count, eq } from 'drizzle-orm';
import { DbService } from '../../db/db.service.js';
import { profiles, userProgress, type Profile } from '../../db/schema/index.js';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';
import { toUsernameBase, withRandomSuffix } from './username.js';

// How many usernames to try before giving up on creating a profile.
const USERNAME_ATTEMPTS = 5;

// Postgres error code for a unique-constraint violation.
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  async getMe(user: AuthUser): Promise<MeResponse> {
    return this.toMe(await this.getOrCreate(user));
  }

  async updateMe(user: AuthUser, dto: UpdateMeDto): Promise<MeResponse> {
    const current = await this.getOrCreate(user);
    if (dto.username === undefined && dto.avatarUrl === undefined) {
      return this.toMe(current);
    }

    try {
      const [updated] = await this.db.drizzle
        .update(profiles)
        .set({ username: dto.username, avatarUrl: dto.avatarUrl })
        .where(eq(profiles.id, user.id))
        .returning();
      return this.toMe(updated);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException({
          code: 'USERNAME_TAKEN',
          message: 'That username is taken. Try another one.',
        });
      }
      throw err;
    }
  }

  // Returns the user's profile, creating it on their first request.
  private async getOrCreate(user: AuthUser): Promise<Profile> {
    const existing = await this.findById(user.id);
    if (existing) return existing;

    const base = toUsernameBase(user.name ?? user.email ?? 'user');
    for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt++) {
      const username = attempt === 0 ? base : withRandomSuffix(base);

      // Skips the insert on any conflict: the username is taken, or a
      // parallel first request already created this user's row.
      const [created] = await this.db.drizzle
        .insert(profiles)
        .values({ id: user.id, username })
        .onConflictDoNothing()
        .returning();
      if (created) return created;

      const raced = await this.findById(user.id);
      if (raced) return raced;
    }

    throw new ConflictException({
      code: 'USERNAME_TAKEN',
      message: 'Could not pick a username. Try again.',
    });
  }

  private async findById(id: string): Promise<Profile | undefined> {
    const [row] = await this.db.drizzle
      .select()
      .from(profiles)
      .where(eq(profiles.id, id));
    return row;
  }

  private async toMe(profile: Profile): Promise<MeResponse> {
    const [{ done }] = await this.db.drizzle
      .select({ done: count() })
      .from(userProgress)
      .where(eq(userProgress.userId, profile.id));

    return {
      id: profile.id,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      // Fixed until their tables exist: XP and streak in S4, rating in S8.
      xp: 0,
      streak: { current: 0, longest: 0, freezes: 0 },
      rating: 1200,
      lessonsCompleted: done,
    };
  }
}

// Drizzle wraps driver errors, so the Postgres code may sit on `cause`.
function isUniqueViolation(err: unknown): boolean {
  const codeOf = (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e ? e.code : undefined;
  const cause =
    typeof err === 'object' && err !== null && 'cause' in err
      ? err.cause
      : undefined;
  return codeOf(err) === UNIQUE_VIOLATION || codeOf(cause) === UNIQUE_VIOLATION;
}
