import { Injectable } from '@nestjs/common';
import type { LeagueResponse, LeagueZone } from '@loophole/shared';
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { avatarOf } from '../../common/avatars.js';
import { istDate, istWeekStart } from '../../common/ist-calendar.js';
import { DbService } from '../../db/db.service.js';
import {
  leagueGroups,
  leagueMembers,
  profiles,
  xpEvents,
} from '../../db/schema/index.js';
import {
  GROUP_SIZE,
  TIERS,
  nextTier,
  rankStandings,
  zoneOf,
  zoneSizes,
} from './league-rules.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Week = { start: string; from: Date; to: Date };

// The IST week `now` falls in: its Monday as "YYYY-MM-DD", and its bounds.
function weekOf(now: Date): Week {
  const from = istWeekStart(now);
  return {
    start: istDate(from),
    from,
    to: new Date(from.getTime() + WEEK_MS),
  };
}

// The IST week that began on `start` ("YYYY-MM-DD").
function weekStarting(start: string): Week {
  const from = new Date(`${start}T00:00:00+05:30`);
  return { start, from, to: new Date(from.getTime() + WEEK_MS) };
}

const tierOf = (level: number) => ({ level, name: TIERS[level] });

// Weekly leagues (ADR-038). No scheduled job: a learner joins this week's
// group with their first XP of the week, and last week's result (up, down
// or stay) is worked out at that moment from last week's XP.
@Injectable()
export class LeaguesService {
  constructor(private readonly db: DbService) {}

  // Called after XP is paid. Puts the learner in a group for this week if
  // they aren't in one yet: the tier their last league week earned them,
  // the oldest group in that tier with room, or a new one. Two learners
  // joining at the same instant can push a group one past 20; harmless.
  async join(userId: string, now = new Date()): Promise<void> {
    const week = weekOf(now);
    const [already] = await this.db.drizzle
      .select({ groupId: leagueMembers.groupId })
      .from(leagueMembers)
      .where(
        and(
          eq(leagueMembers.weekStart, week.start),
          eq(leagueMembers.userId, userId),
        ),
      );
    if (already) return;

    const last = await this.lastWeek(userId, week.start);
    const tier = last ? nextTier(last.tier, last.zone) : 0;

    const open = await this.db.drizzle
      .select({ id: leagueGroups.id, size: count(leagueMembers.userId) })
      .from(leagueGroups)
      .leftJoin(leagueMembers, eq(leagueMembers.groupId, leagueGroups.id))
      .where(
        and(
          eq(leagueGroups.weekStart, week.start),
          eq(leagueGroups.tier, tier),
        ),
      )
      .groupBy(leagueGroups.id)
      .orderBy(asc(leagueGroups.createdAt));
    let groupId = open.find((g) => g.size < GROUP_SIZE)?.id;
    if (!groupId) {
      const [created] = await this.db.drizzle
        .insert(leagueGroups)
        .values({ weekStart: week.start, tier })
        .returning({ id: leagueGroups.id });
      groupId = created.id;
    }

    await this.db.drizzle
      .insert(leagueMembers)
      .values({ weekStart: week.start, userId, groupId, joinedAt: now })
      .onConflictDoNothing();
  }

  // GET /leagues/current: this week's group, ranked, with each member's
  // zone if the week ended now, and how the learner's last week ended.
  async current(userId: string, now = new Date()): Promise<LeagueResponse> {
    const week = weekOf(now);
    const last = await this.lastWeek(userId, week.start);
    const [mine] = await this.db.drizzle
      .select({ groupId: leagueMembers.groupId, tier: leagueGroups.tier })
      .from(leagueMembers)
      .innerJoin(leagueGroups, eq(leagueMembers.groupId, leagueGroups.id))
      .where(
        and(
          eq(leagueMembers.weekStart, week.start),
          eq(leagueMembers.userId, userId),
        ),
      );

    const lastWeek = last
      ? {
          tier: tierOf(last.tier),
          rank: last.rank,
          size: last.size,
          zone: last.zone,
        }
      : null;
    const base = {
      weekStart: week.from.toISOString(),
      endsAt: week.to.toISOString(),
      lastWeek,
    };

    if (!mine) {
      const tier = last ? nextTier(last.tier, last.zone) : 0;
      return {
        ...base,
        tier: tierOf(tier),
        joined: false,
        zones: { up: 0, down: 0 },
        members: [],
      };
    }

    const ranked = await this.standings(mine.groupId, week);
    const size = ranked.length;
    return {
      ...base,
      tier: tierOf(mine.tier),
      joined: true,
      zones: zoneSizes(size, mine.tier),
      members: ranked.map((m, i) => ({
        rank: i + 1,
        userId: m.userId,
        username: m.username,
        avatar: avatarOf(m.userId, m.chosenAvatar),
        xp: m.xp,
        zone: zoneOf(i + 1, size, mine.tier),
      })),
    };
  }

  // The learner's most recent league week before `beforeWeek`, and where
  // they finished in it.
  private async lastWeek(
    userId: string,
    beforeWeek: string,
  ): Promise<{
    tier: number;
    rank: number;
    size: number;
    zone: LeagueZone;
  } | null> {
    const [prev] = await this.db.drizzle
      .select({
        weekStart: leagueMembers.weekStart,
        groupId: leagueMembers.groupId,
        tier: leagueGroups.tier,
      })
      .from(leagueMembers)
      .innerJoin(leagueGroups, eq(leagueMembers.groupId, leagueGroups.id))
      .where(
        and(
          eq(leagueMembers.userId, userId),
          lt(leagueMembers.weekStart, beforeWeek),
        ),
      )
      .orderBy(desc(leagueMembers.weekStart))
      .limit(1);
    if (!prev) return null;

    const ranked = await this.standings(
      prev.groupId,
      weekStarting(prev.weekStart),
    );
    const rank = ranked.findIndex((m) => m.userId === userId) + 1;
    return {
      tier: prev.tier,
      rank,
      size: ranked.length,
      zone: zoneOf(rank, ranked.length, prev.tier),
    };
  }

  // A group's members with the XP each earned in that week, ranked.
  private async standings(groupId: string, week: Week) {
    const members = await this.db.drizzle
      .select({
        userId: leagueMembers.userId,
        username: profiles.username,
        chosenAvatar: profiles.avatar,
        joinedAt: leagueMembers.joinedAt,
      })
      .from(leagueMembers)
      .innerJoin(profiles, eq(profiles.id, leagueMembers.userId))
      .where(eq(leagueMembers.groupId, groupId));
    if (members.length === 0) return [];

    const totals = await this.db.drizzle
      .select({
        userId: xpEvents.userId,
        xp: sql<number>`cast(sum(${xpEvents.amount}) as int)`,
      })
      .from(xpEvents)
      .where(
        and(
          inArray(
            xpEvents.userId,
            members.map((m) => m.userId),
          ),
          gte(xpEvents.createdAt, week.from),
          lt(xpEvents.createdAt, week.to),
        ),
      )
      .groupBy(xpEvents.userId);
    const xpOf = new Map(totals.map((t) => [t.userId, t.xp]));
    return rankStandings(
      members.map((m) => ({ ...m, xp: xpOf.get(m.userId) ?? 0 })),
    );
  }
}
