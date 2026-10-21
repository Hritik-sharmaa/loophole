// The e2e mock backend (ADR-034): Supabase Auth, every REST route the web
// app calls, and the /duels Socket.io namespace, on one port. It reads the
// real content/ folder and keeps state per user (each test signs up with
// its own email), so tests can run in parallel. Typed against
// @loophole/shared so its shapes can't drift from the real API.
//
// Run with Node's built-in TypeScript support: node e2e/mock-backend.mts
// Not a grader: a program passes when it calls no unknown function and
// contains every sample test's expected output (enough for "print exactly
// ..." lessons); a duel or the bug of the day passes once the code changes.

import type {
  ActivityResponse,
  BotDuel,
  BotDuelSubmission,
  BotOpponent,
  CourseOverview,
  CoursePath,
  DailyBugBoard,
  DailyBugPlay,
  DailyBugResult,
  DailyBugToday,
  DailyGoal,
  DuelEnd,
  DuelHistoryEntry,
  DuelLanguage,
  DuelReplay,
  DuelReplayEvent,
  DuelStart,
  DuelSubmissionResult,
  ExplainCardResponse,
  ExplainResponse,
  GitCheck,
  HintResponse,
  LeagueResponse,
  LearnCard,
  LessonDetail,
  LessonLanguage,
  LessonLearn,
  LessonState,
  MeResponse,
  PracticeItem,
  PracticeSet,
  QueueJoined,
  QueueJoinRequest,
  RatingLeaderboard,
  RunResponse,
  SubmissionResult,
  SubmissionSummary,
  TestCase,
  TestResult,
  UnitBugHunt,
  UnitCheatSheet,
  WebCheck,
  WeeklyLeaderboard,
} from '@loophole/shared';
import { createHash, randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const CONTENT = fileURLToPath(new URL('../../../content', import.meta.url));

// ---- Content, as the seed would load it ----

type ExerciseFile = {
  prompt: string;
  starterCode: string;
  sampleTests?: TestCase[];
  checks?: WebCheck[];
  gitScenario?: { checks: GitCheck[] };
};
type LessonFile = {
  title: string;
  learn?: LessonLearn;
  exercise: ExerciseFile;
};
type Lesson = LessonFile & {
  id: string;
  exerciseId: string;
  unitId: string;
  course: Course;
};
type Unit = { id: string; title: string; lessons: Lesson[] };
type Course = {
  id: string;
  slug: string;
  title: string;
  language: string;
  description: string;
  units: Unit[];
};

const readJson = <T,>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;
const isDir = (path: string) => statSync(path).isDirectory();

const courses: Course[] = [];
const lessonsById = new Map<string, Lesson>();
for (const dir of readdirSync(CONTENT).filter(
  (d) => d !== 'duels' && isDir(join(CONTENT, d)),
)) {
  const base = join(CONTENT, dir);
  const meta = readJson<Omit<Course, 'id' | 'units'>>(
    join(base, 'course.json'),
  );
  const course: Course = { ...meta, id: randomUUID(), units: [] };
  for (const u of readdirSync(base)
    .filter((d) => isDir(join(base, d)))
    .sort()) {
    const unitMeta = readJson<{ title: string }>(join(base, u, 'unit.json'));
    const unit: Unit = { id: randomUUID(), title: unitMeta.title, lessons: [] };
    for (const f of readdirSync(join(base, u))
      .filter((f) => f !== 'unit.json')
      .sort()) {
      const lesson: Lesson = {
        ...readJson<LessonFile>(join(base, u, f)),
        id: randomUUID(),
        exerciseId: randomUUID(),
        unitId: unit.id,
        course,
      };
      unit.lessons.push(lesson);
      lessonsById.set(lesson.id, lesson);
    }
    course.units.push(unit);
  }
  courses.push(course);
}
const lessonByExercise = new Map(
  [...lessonsById.values()].map((l) => [l.exerciseId, l]),
);

// The first problem of each duel pool (ADR-040); the files carry their
// language, so they are already DuelStart problems.
type DuelFile = DuelStart['problem'] & { slug: string };
const firstDuel = (language: DuelLanguage) =>
  readJson<DuelFile>(
    join(
      CONTENT,
      'duels',
      language,
      readdirSync(join(CONTENT, 'duels', language)).sort()[0],
    ),
  );
const duelProblems: Record<DuelLanguage, DuelFile> = {
  python: firstDuel('python'),
  javascript: firstDuel('javascript'),
};
// The bug of the day stays Python.
const duelProblem = duelProblems.python;
const problemView = (p: DuelFile): DuelStart['problem'] => ({
  title: p.title,
  language: p.language,
  description: p.description,
  buggyCode: p.buggyCode,
  sampleTests: p.sampleTests,
});

// ---- Users ----

type UserState = {
  id: string;
  email: string;
  username: string;
  dailyGoal: DailyGoal | null;
  lessonLanguage: LessonLanguage;
  rating: number;
  xp: { at: Date; amount: number }[];
  completed: Map<string, Date>;
  submissions: Map<string, SubmissionSummary[]>;
  aiLeft: number;
  dueled: boolean;
};
const users = new Map<string, UserState>();

// A stable id per email, shaped like a uuid.
function idFor(email: string): string {
  const h = createHash('sha1').update(email).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function userFor(email: string): UserState {
  const id = idFor(email);
  let user = users.get(id);
  if (!user) {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    user = {
      id,
      email,
      username: base.slice(0, 20).padEnd(3, '_'),
      dailyGoal: null,
      lessonLanguage: 'en',
      rating: 1000,
      xp: [],
      completed: new Map(),
      submissions: new Map(),
      aiLeft: 20,
      dueled: false,
    };
    users.set(id, user);
  }
  return user;
}

// Tokens are unsigned: "header.<base64url json>.mock".
function tokenFor(user: UserState): string {
  const exp = Math.floor(Date.now() / 1000) + 86_400;
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      exp,
      aud: 'authenticated',
      role: 'authenticated',
    }),
  ).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.mock`;
}

function userFromToken(token: string | undefined): UserState | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const { sub } = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { sub?: string };
    return (sub && users.get(sub)) || null;
  } catch {
    return null;
  }
}

function authUser(user: UserState) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2026-10-01T00:00:00Z',
  };
}

function session(user: UserState) {
  return {
    access_token: tokenFor(user),
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: Math.floor(Date.now() / 1000) + 86_400,
    refresh_token: `refresh-${user.id}`,
    user: authUser(user),
  };
}

// ---- IST days, as the API counts them ----

const IST_MS = (5 * 60 + 30) * 60_000;
const istDate = (d: Date) =>
  new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
const plusDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
function weekStart(now: Date): string {
  const today = istDate(now);
  const sinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return plusDays(today, -sinceMonday);
}
const xpSince = (user: UserState, day: string) =>
  user.xp.filter((e) => istDate(e.at) >= day).reduce((n, e) => n + e.amount, 0);

// ---- Answers ----

function states(user: UserState, course: Course): Map<string, LessonState> {
  const all = course.units.flatMap((u) => u.lessons);
  const firstOpen = all.findIndex((l) => !user.completed.has(l.id));
  return new Map(
    all.map((l, i) => [
      l.id,
      user.completed.has(l.id)
        ? 'completed'
        : i === firstOpen
          ? 'active'
          : 'locked',
    ]),
  );
}

function me(user: UserState): MeResponse {
  const days = new Set(user.xp.map((e) => istDate(e.at)));
  let current = 0;
  let day = istDate(new Date());
  if (!days.has(day)) day = plusDays(day, -1);
  while (days.has(day)) {
    current++;
    day = plusDays(day, -1);
  }
  return {
    id: user.id,
    username: user.username,
    avatarUrl: null,
    xp: user.xp.reduce((n, e) => n + e.amount, 0),
    streak: { current, longest: current, freezes: 0 },
    rating: user.rating,
    lessonsCompleted: user.completed.size,
    dailyGoal: user.dailyGoal,
    lessonLanguage: user.lessonLanguage,
    todayXp: xpSince(user, istDate(new Date())),
  };
}

function overview(user: UserState): CourseOverview[] {
  const list = courses.map((c) => {
    const ids = c.units.flatMap((u) => u.lessons.map((l) => l.id));
    const done = ids.filter((id) => user.completed.has(id));
    const last = done
      .map((id) => user.completed.get(id)!.getTime())
      .sort((a, b) => b - a)[0];
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      language: c.language,
      description: c.description,
      lessonCount: ids.length,
      completedCount: done.length,
      lastActivityAt: last ? new Date(last).toISOString() : null,
    };
  });
  // Started courses first, most recent first, then by title (ADR-023).
  return list.sort(
    (a, b) =>
      (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? '') ||
      a.title.localeCompare(b.title),
  );
}

function path(user: UserState, course: Course): CoursePath {
  const st = states(user, course);
  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      language: course.language,
    },
    units: course.units.map((u) => ({
      id: u.id,
      title: u.title,
      bugs: u.lessons.flatMap((l) => l.learn?.cards ?? []).filter((c) => c.bug)
        .length,
      lessons: u.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        state: st.get(l.id) ?? 'locked',
      })),
    })),
    certificateSlug: null,
  };
}

const kindOf = (language: string) =>
  language === 'html' ? 'web' : language === 'git' ? 'git' : 'program';

// The content files carry Hinglish next to the English (ADR-042); like the
// API, pick one language and drop the rest.
type Stored = {
  hi?: {
    title?: string;
    body?: string;
    fix?: string;
    question?: string;
    explanation?: string;
    options?: string[];
  };
};
function localLearn(
  learn: LessonLearn | undefined,
  language: LessonLanguage,
): LessonLearn | null {
  if (!learn) return null;
  const pick = language === 'hinglish';
  return {
    cards: learn.cards.map((card) => {
      const { hi, ...en } = card as LearnCard & Stored;
      if (!pick || !hi) return en;
      return {
        ...en,
        title: hi.title ?? en.title,
        body: hi.body ?? en.body,
        ...(en.bug && hi.fix ? { bug: { ...en.bug, fix: hi.fix } } : {}),
      };
    }),
    check: (() => {
      const { hi, ...en } = learn.check as LessonLearn['check'] & Stored;
      if (!pick || !hi) return en;
      return {
        ...en,
        question: hi.question ?? en.question,
        explanation: hi.explanation ?? en.explanation,
        options: hi.options ?? en.options,
      };
    })(),
  };
}

function lessonDetail(
  lesson: Lesson,
  language: LessonLanguage = 'en',
): LessonDetail {
  const { exercise } = lesson;
  const promptHi = (exercise as { promptHi?: string }).promptHi;
  return {
    id: lesson.id,
    title: lesson.title,
    course: {
      slug: lesson.course.slug,
      title: lesson.course.title,
      language: lesson.course.language,
    },
    learn: localLearn(lesson.learn, language),
    exercise: {
      id: lesson.exerciseId,
      kind: kindOf(lesson.course.language),
      prompt: language === 'hinglish' && promptHi ? promptHi : exercise.prompt,
      starterCode: exercise.starterCode,
      sampleTests: exercise.sampleTests ?? [],
      checks: (exercise.checks ?? exercise.gitScenario?.checks ?? []).map(
        (c) => c.label,
      ),
    },
  };
}

// The first call to a name Python doesn't know, as a NameError.
const KNOWN = ['print', 'input', 'int', 'str', 'len', 'range', 'float'];
function nameError(code: string): string {
  const unknown = [...code.matchAll(/\b([a-z_]\w*)\(/g)]
    .map((m) => m[1])
    .find((n) => !KNOWN.includes(n));
  return unknown
    ? `Traceback (most recent call last):\n  File "main.py", line 1, in <module>\nNameError: name '${unknown}' is not defined`
    : '';
}

function grade(
  user: UserState,
  lesson: Lesson,
  code: string,
): SubmissionResult {
  const kind = kindOf(lesson.course.language);
  const samples = lesson.exercise.sampleTests ?? [];
  let results: TestResult[];
  let stderr = '';
  if (kind === 'program') {
    stderr = nameError(code);
    const passed =
      !stderr && samples.every((t) => code.includes(t.expectedOutput.trim()));
    results = [
      ...samples.map((t) => ({
        kind: 'sample' as const,
        passed,
        input: t.input,
        expected: t.expectedOutput,
        actual: passed ? t.expectedOutput : '',
      })),
      ...[0, 1, 2].map(() => ({ kind: 'hidden' as const, passed })),
    ];
  } else {
    const labels = (
      lesson.exercise.checks ??
      lesson.exercise.gitScenario?.checks ??
      []
    ).map((c) => c.label);
    const passed = code.trim() !== lesson.exercise.starterCode.trim();
    results = labels.map((label) => ({
      kind: 'check' as const,
      passed,
      label,
    }));
  }
  const testsPassed = results.filter((r) => r.passed).length;
  const status = testsPassed === results.length ? 'passed' : 'failed';
  const lessonCompleted = status === 'passed';
  let xpAwarded = 0;
  if (lessonCompleted && !user.completed.has(lesson.id)) {
    const now = new Date();
    user.completed.set(lesson.id, now);
    user.xp.push({ at: now, amount: 10 });
    xpAwarded = 10;
  }
  const id = randomUUID();
  const history = user.submissions.get(lesson.exerciseId) ?? [];
  history.unshift({
    id,
    status,
    testsPassed,
    totalTests: results.length,
    code,
    submittedAt: new Date().toISOString(),
  });
  user.submissions.set(lesson.exerciseId, history);
  return {
    id,
    status,
    testsPassed,
    totalTests: results.length,
    lessonCompleted,
    xpAwarded,
    results,
    stderr,
    certificateSlug: null,
  };
}

function weekly(user: UserState): WeeklyLeaderboard {
  const start = weekStart(new Date());
  const ranked = [...users.values()]
    .map((u) => ({ userId: u.id, username: u.username, xp: xpSince(u, start) }))
    .filter((e) => e.xp > 0)
    .sort((a, b) => b.xp - a.xp || a.username.localeCompare(b.username));
  const entries = ranked.map((e) => ({
    ...e,
    rank: 1 + ranked.filter((o) => o.xp > e.xp).length,
  }));
  const mine = entries.find((e) => e.userId === user.id);
  return {
    weekStart: new Date(`${start}T00:00:00+05:30`).toISOString(),
    entries: entries.slice(0, 50),
    me: { rank: mine?.rank ?? null, xp: mine?.xp ?? 0 },
  };
}

// Weekly leagues (ADR-038), simplified: a learner with XP this week is in
// a Silver group (they "moved up" from Bronze) with four fixed rivals.
function league(user: UserState): LeagueResponse {
  const start = weekStart(new Date());
  const from = new Date(`${start}T00:00:00+05:30`);
  const mine = xpSince(user, start);
  const base = {
    weekStart: from.toISOString(),
    endsAt: new Date(from.getTime() + 7 * 86_400_000).toISOString(),
    tier: { level: 1, name: 'Silver' },
    lastWeek: {
      tier: { level: 0, name: 'Bronze' },
      rank: 1,
      size: 5,
      zone: 'up' as const,
    },
  };
  if (mine === 0) {
    return { ...base, joined: false, zones: { up: 0, down: 0 }, members: [] };
  }
  const rivals = [
    { username: 'ananya', xp: 40 },
    { username: 'rohan', xp: 25 },
    { username: 'diya', xp: 15 },
    { username: 'kabir', xp: 5 },
  ].map((r, i) => ({ ...r, userId: `rival-${i}` }));
  const ranked = [
    ...rivals,
    { userId: user.id, username: user.username, xp: mine },
  ].sort((a, b) => b.xp - a.xp);
  const up = Math.ceil(ranked.length / 4);
  return {
    ...base,
    joined: true,
    zones: { up, down: 0 },
    members: ranked.map((m, i) => ({
      ...m,
      rank: i + 1,
      zone: i < up ? ('up' as const) : ('stay' as const),
    })),
  };
}

function ratings(user: UserState): RatingLeaderboard {
  const ranked = [...users.values()]
    .filter((u) => u.dueled)
    .sort((a, b) => b.rating - a.rating);
  const entries = ranked.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    elo: u.rating,
  }));
  return {
    entries,
    me: {
      rank: entries.find((e) => e.userId === user.id)?.rank ?? null,
      elo: user.rating,
    },
  };
}

// Today's bug-of-the-day play; opening it starts the clock.
const dailyPlays = new Map<string, DailyBugPlay>();
function dailyPlay(user: UserState): DailyBugPlay {
  const key = `${user.id}:${istDate(new Date())}`;
  let play = dailyPlays.get(key);
  if (!play) {
    play = {
      openedAt: new Date().toISOString(),
      solvedAt: null,
      timeMs: null,
      attempts: 0,
    };
    dailyPlays.set(key, play);
  }
  return play;
}

function dailyBoard(user: UserState): DailyBugBoard {
  const day = istDate(new Date());
  const solved = [...users.values()]
    .map((u) => ({ u, play: dailyPlays.get(`${u.id}:${day}`) }))
    .filter(({ play }) => play?.timeMs != null)
    .sort((a, b) => a.play!.timeMs! - b.play!.timeMs!)
    .map(({ u, play }, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      timeMs: play!.timeMs!,
      attempts: play!.attempts,
    }));
  const mine = solved.find((e) => e.userId === user.id);
  return {
    day,
    title: duelProblem.title,
    solvers: solved.length,
    entries: solved.slice(0, 10),
    me: mine ? { rank: mine.rank, timeMs: mine.timeMs } : null,
    started: dailyPlays.has(`${user.id}:${day}`),
  };
}

// ---- HTTP ----

// Practice duels against a guide bot (ADR-039). The bot is slow here (it
// finishes after four minutes), so a test always outruns it.
const BOT_SCHEDULE = [60_000, 90_000, 120_000, 150_000, 240_000];
const botDuels = new Map<string, BotDuel>();
const botDuelOwners = new Map<string, string>();

function botDuel(u: UserState, id: string): BotDuel | null {
  const duel = botDuels.get(id);
  if (!duel || botDuelOwners.get(id) !== u.id) return null;
  const finish = Date.parse(duel.startedAt) + BOT_SCHEDULE.at(-1)!;
  if (duel.result === null && Date.now() >= finish) duel.result = 'lost';
  return { ...duel };
}

// Finished live duels, for history and replays (ADR-041).
const replays = new Map<
  string,
  { owner: string; endedAt: string; replay: DuelReplay }
>();

type Reply = { status: number; body: unknown };
const ok = (body: unknown): Reply => ({ status: 200, body });
const fail = (status: number, code: string, message: string): Reply => ({
  status,
  body: { error: { code, message } },
});
type Handler = (
  m: RegExpMatchArray,
  ctx: { body: Record<string, unknown>; user: UserState | null; url: URL },
) => Reply;

const authRoutes: [string, RegExp, Handler][] = [
  [
    'POST',
    /^\/auth\/v1\/(token|signup)$/,
    (_m, { body }) =>
      typeof body.email === 'string'
        ? ok(session(userFor(body.email)))
        : fail(400, 'invalid_request', 'Email needed'),
  ],
  [
    'GET',
    /^\/auth\/v1\/user$/,
    (_m, { user }) =>
      user ? ok(authUser(user)) : fail(401, 'UNAUTHENTICATED', 'No session'),
  ],
  ['POST', /^\/auth\/v1\/logout/, () => ({ status: 204, body: {} })],
];

// Routes that need a signed-in user.
const apiRoutes: [
  string,
  RegExp,
  (
    m: RegExpMatchArray,
    u: UserState,
    ctx: { body: Record<string, unknown>; url: URL },
  ) => Reply,
][] = [
  ['GET', /^\/me$/, (_m, u) => ok(me(u))],
  [
    'PATCH',
    /^\/me$/,
    (_m, u, { body }) => {
      if (body.dailyGoal !== undefined) {
        if (![10, 20, 30].includes(body.dailyGoal as number)) {
          return fail(
            400,
            'VALIDATION_FAILED',
            'dailyGoal must be 10, 20 or 30',
          );
        }
        u.dailyGoal = body.dailyGoal as DailyGoal;
      }
      if (body.lessonLanguage !== undefined) {
        if (
          body.lessonLanguage !== 'en' &&
          body.lessonLanguage !== 'hinglish'
        ) {
          return fail(
            400,
            'VALIDATION_FAILED',
            'lessonLanguage must be en or hinglish',
          );
        }
        u.lessonLanguage = body.lessonLanguage;
      }
      if (typeof body.username === 'string') u.username = body.username;
      return ok(me(u));
    },
  ],
  [
    'GET',
    /^\/me\/activity$/,
    (_m, u) => {
      const now = new Date();
      const from = plusDays(weekStart(now), -28);
      const byDay = new Map<string, number>();
      for (const e of u.xp) {
        const day = istDate(e.at);
        if (day >= from) byDay.set(day, (byDay.get(day) ?? 0) + e.amount);
      }
      const activity: ActivityResponse = {
        from,
        today: istDate(now),
        days: [...byDay].sort().map(([date, xp]) => ({ date, xp })),
      };
      return ok(activity);
    },
  ],
  ['GET', /^\/courses$/, (_m, u) => ok(overview(u))],
  [
    'GET',
    /^\/courses\/([^/]+)\/path$/,
    (m, u) => {
      const course = courses.find((c) => c.slug === m[1]);
      return course
        ? ok(path(u, course))
        : fail(404, 'NOT_FOUND', 'Course not found.');
    },
  ],
  // ADR-037: every quick check and bug card of the lessons this user
  // finished in the course (the real API samples up to 8, older first).
  [
    'GET',
    /^\/courses\/([^/]+)\/practice$/,
    (m, u) => {
      const course = courses.find((c) => c.slug === m[1]);
      if (!course) return fail(404, 'NOT_FOUND', 'Course not found.');
      const items: PracticeItem[] = course.units
        .flatMap((unit) => unit.lessons)
        .filter((l) => u.completed.has(l.id) && l.learn)
        .map((l) => ({ ...l, learn: localLearn(l.learn, u.lessonLanguage)! }))
        .flatMap((l): PracticeItem[] => [
          { kind: 'check', lesson: l.title, check: l.learn.check },
          ...l.learn.cards.flatMap((c): PracticeItem[] =>
            c.bug && c.code !== undefined
              ? [
                  {
                    kind: 'bug',
                    lesson: l.title,
                    body: c.body,
                    code: c.code,
                    bug: c.bug,
                  },
                ]
              : [],
          ),
        ])
        .slice(0, 8);
      const set: PracticeSet = {
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          language: course.language,
        },
        items,
      };
      return ok(set);
    },
  ],
  [
    'GET',
    /^\/courses\/([^/]+)\/units\/([^/]+)\/(cheatsheet|bug-hunt)$/,
    (m, u) => {
      const unit = courses
        .find((c) => c.slug === m[1])
        ?.units.find((x) => x.id === m[2]);
      if (!unit) return fail(404, 'NOT_FOUND', 'Unit not found.');
      const cards = (l: Lesson): LearnCard[] =>
        localLearn(l.learn, u.lessonLanguage)?.cards ?? [];
      if (m[3] === 'cheatsheet') {
        const sheet: UnitCheatSheet = {
          unitId: unit.id,
          title: unit.title,
          lessons: unit.lessons.map((l) => ({
            title: l.title,
            cards: cards(l)
              .filter((c) => !c.bug)
              .map(({ title, body, code }) =>
                code === undefined ? { title, body } : { title, body, code },
              ),
          })),
        };
        return ok(sheet);
      }
      const hunt: UnitBugHunt = {
        unitId: unit.id,
        title: unit.title,
        bugs: unit.lessons.flatMap((l) =>
          cards(l).flatMap(({ title, body, code, bug }) =>
            bug && code !== undefined
              ? [{ lesson: l.title, title, body, code, bug }]
              : [],
          ),
        ),
      };
      return ok(hunt);
    },
  ],
  [
    'GET',
    /^\/lessons\/([^/]+)$/,
    (m, u) => {
      const lesson = lessonsById.get(m[1]);
      if (!lesson) return fail(404, 'NOT_FOUND', 'Lesson not found.');
      if (states(u, lesson.course).get(lesson.id) === 'locked') {
        return fail(403, 'LESSON_LOCKED', 'Finish the previous lesson first.');
      }
      return ok(lessonDetail(lesson, u.lessonLanguage));
    },
  ],
  [
    'GET',
    /^\/submissions$/,
    (_m, u, { url }) =>
      ok(u.submissions.get(url.searchParams.get('exerciseId') ?? '') ?? []),
  ],
  [
    'POST',
    /^\/submissions$/,
    (_m, u, { body }) => {
      const lesson = lessonByExercise.get(String(body.exerciseId));
      if (!lesson) return fail(404, 'NOT_FOUND', 'Exercise not found.');
      return { status: 201, body: grade(u, lesson, String(body.code ?? '')) };
    },
  ],
  [
    'POST',
    /^\/runs$/,
    (_m, _u, { body }) => {
      // The unedited example prints its card's output.
      const lesson = lessonsById.get(String(body.lessonId));
      const card = lesson?.learn?.cards.find(
        (c) => c.code?.trimEnd() === String(body.code).trimEnd(),
      );
      const run: RunResponse = {
        stdout: card?.output ?? '',
        stderr: '',
        timedOut: false,
      };
      return { status: 201, body: run };
    },
  ],
  [
    'POST',
    /^\/git\/run$/,
    (_m, _u, { body }) => ({
      status: 201,
      body: {
        transcript: String(body.commands ?? '')
          .split('\n')
          .filter(Boolean)
          .map((command) => ({ command, output: '' })),
        cwd: '',
      },
    }),
  ],
  [
    'POST',
    /^\/ai\/explain$/,
    (_m, u) => {
      u.aiLeft--;
      const answer: ExplainResponse = {
        explanation:
          'Python does not know the name on line 1. Check how you spelled `print`.',
        line: 1,
        remainingToday: u.aiLeft,
      };
      return { status: 201, body: answer };
    },
  ],
  // ADR-036: a teaching card explained again; bug cards are refused.
  [
    'POST',
    /^\/ai\/explain-card$/,
    (_m, u, { body }) => {
      const card = lessonsById.get(String(body.lessonId))?.learn?.cards[
        Number(body.card)
      ];
      if (!card || card.bug) return fail(404, 'NOT_FOUND', 'Card not found.');
      u.aiLeft--;
      const answer: ExplainCardResponse = {
        explanation: `Think of it like this: ${card.title.toLowerCase()} is a small idea you will use every day.`,
        remainingToday: u.aiLeft,
      };
      return { status: 200, body: answer };
    },
  ],
  [
    'POST',
    /^\/ai\/hint$/,
    (_m, u) => {
      u.aiLeft--;
      const answer: HintResponse = {
        hint: 'Look closely at the word before the brackets.',
        remainingToday: u.aiLeft,
      };
      return { status: 201, body: answer };
    },
  ],
  ['GET', /^\/certificates$/, () => ok([])],
  [
    'GET',
    /^\/certificates\/([^/]+)$/,
    () => fail(404, 'NOT_FOUND', 'Certificate not found.'),
  ],
  // Bug of the day (ADR-035): today's bug, its board, and a submit that
  // solves it once the code differs from the buggy program.
  [
    'GET',
    /^\/bug-of-the-day$/,
    (_m, u) => {
      const play = dailyPlay(u);
      const today: DailyBugToday = {
        day: istDate(new Date()),
        problem: {
          title: duelProblem.title,
          description: duelProblem.description,
          buggyCode: duelProblem.buggyCode,
          sampleTests: duelProblem.sampleTests,
        },
        me: play,
      };
      return ok(today);
    },
  ],
  ['GET', /^\/bug-of-the-day\/board$/, (_m, u) => ok(dailyBoard(u))],
  [
    'POST',
    /^\/bug-of-the-day\/submissions$/,
    (_m, u, { body }) => {
      const play = dailyPlay(u);
      play.attempts++;
      const fixed =
        String(body.code ?? '').trim() !== duelProblem.buggyCode.trim();
      let xpAwarded = 0;
      if (fixed && !play.solvedAt) {
        const now = new Date();
        play.solvedAt = now.toISOString();
        play.timeMs = now.getTime() - new Date(play.openedAt).getTime();
        u.xp.push({ at: now, amount: 20 });
        xpAwarded = 20;
      }
      const board = dailyBoard(u);
      const result: DailyBugResult = {
        status: fixed ? 'passed' : 'failed',
        testsPassed: fixed ? 5 : 1,
        totalTests: 5,
        results: Array.from({ length: 5 }, (_, i) => ({
          kind: 'hidden' as const,
          passed: fixed || i === 0,
        })),
        stderr: '',
        solved: play.solvedAt !== null,
        xpAwarded,
        timeMs: play.timeMs,
        rank: board.me?.rank ?? null,
        solvers: board.solvers,
      };
      return { status: 201, body: result };
    },
  ],
  [
    'POST',
    /^\/bot-duels$/,
    (_m, u, { body }) => {
      const now = Date.now();
      const duel: BotDuel = {
        id: randomUUID(),
        opponent: body.opponent as BotOpponent,
        problem: problemView(
          duelProblems[body.language as DuelLanguage] ?? duelProblem,
        ),
        startedAt: new Date(now).toISOString(),
        endsAt: new Date(now + 300_000).toISOString(),
        totalTests: BOT_SCHEDULE.length,
        botSchedule: BOT_SCHEDULE,
        result: null,
        timeMs: null,
        attempts: 0,
      };
      botDuels.set(duel.id, duel);
      botDuelOwners.set(duel.id, u.id);
      return { status: 201, body: botDuel(u, duel.id) };
    },
  ],
  [
    'GET',
    /^\/bot-duels\/([^/]+)$/,
    (m, u) => {
      const duel = botDuel(u, m[1]);
      return duel ? ok(duel) : fail(404, 'NOT_FOUND', 'Duel not found.');
    },
  ],
  [
    'POST',
    /^\/bot-duels\/([^/]+)\/submissions$/,
    (m, u, { body }) => {
      const view = botDuel(u, m[1]);
      if (!view) return fail(404, 'NOT_FOUND', 'Duel not found.');
      if (view.result) {
        return fail(409, 'ILLEGAL_TRANSITION', 'This duel is over.');
      }
      const duel = botDuels.get(m[1])!;
      duel.attempts++;
      const fixed =
        String(body.code ?? '').trim() !== duel.problem.buggyCode.trim();
      if (fixed) {
        duel.result = 'won';
        duel.timeMs = Date.now() - Date.parse(duel.startedAt);
      }
      const result: BotDuelSubmission = {
        status: fixed ? 'passed' : 'failed',
        testsPassed: fixed ? 5 : 1,
        totalTests: 5,
        results: Array.from({ length: 5 }, (_, i) => ({
          kind: 'hidden' as const,
          passed: fixed || i === 0,
        })),
        stderr: '',
        duel: botDuel(u, m[1])!,
      };
      return { status: 201, body: result };
    },
  ],
  [
    'POST',
    /^\/bot-duels\/([^/]+)\/forfeit$/,
    (m, u) => {
      const view = botDuel(u, m[1]);
      if (!view) return fail(404, 'NOT_FOUND', 'Duel not found.');
      if (view.result) {
        return fail(409, 'ILLEGAL_TRANSITION', 'This duel is over.');
      }
      botDuels.get(m[1])!.result = 'gave-up';
      return { status: 201, body: botDuel(u, m[1]) };
    },
  ],
  [
    'GET',
    /^\/duels\/history$/,
    (_m, u) => {
      const entries: DuelHistoryEntry[] = [...replays.values()]
        .filter((r) => r.owner === u.id)
        .reverse()
        .map(({ endedAt, replay }) => {
          const best = (who: DuelReplayEvent['who']) =>
            Math.max(
              0,
              ...replay.events
                .filter((e) => e.who === who)
                .map((e) => e.testsPassed),
            );
          return {
            id: replay.id,
            title: replay.problem.title,
            language: replay.problem.language,
            opponent: replay.opponent,
            outcome: replay.outcome,
            result: replay.result,
            endedAt,
            myBest: best('me'),
            opponentBest: best('opponent'),
            totalTests: replay.totalTests,
          };
        });
      return ok(entries);
    },
  ],
  [
    'GET',
    /^\/duels\/([^/]+)\/replay$/,
    (m, u) => {
      const found = replays.get(m[1]);
      return found && found.owner === u.id
        ? ok(found.replay)
        : fail(404, 'NOT_FOUND', 'Duel not found.');
    },
  ],
  ['GET', /^\/leagues\/current$/, (_m, u) => ok(league(u))],
  ['GET', /^\/leaderboard\/weekly$/, (_m, u) => ok(weekly(u))],
  ['GET', /^\/leaderboard\/rating$/, (_m, u) => ok(ratings(u))],
];

function send(res: ServerResponse, { status, body }: Reply) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  });
  res.end(status === 204 ? '' : JSON.stringify(body));
}

async function readBody(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) raw += String(chunk);
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const server = createServer((req, res) => {
  void (async () => {
    if (req.method === 'OPTIONS') return send(res, { status: 204, body: {} });
    const url = new URL(req.url ?? '/', 'http://mock');
    if (url.pathname === '/health') return send(res, ok({ status: 'ok' }));
    const body = await readBody(req);
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const user = userFromToken(token);

    for (const [method, re, handler] of authRoutes) {
      const m = url.pathname.match(re);
      if (m && method === req.method) {
        return send(res, handler(m, { body, user, url }));
      }
    }
    for (const [method, re, handler] of apiRoutes) {
      const m = url.pathname.match(re);
      if (m && method === req.method) {
        return send(
          res,
          user
            ? handler(m, user, { body, url })
            : fail(401, 'UNAUTHENTICATED', 'Sign in first.'),
        );
      }
    }
    console.log(`mock: unmocked ${req.method} ${url.pathname}`);
    send(res, fail(404, 'NOT_FOUND', `Not mocked: ${url.pathname}`));
  })();
});

// ---- /duels: an opponent who always loses to a changed program ----

const io = new Server(server, { cors: { origin: '*' } });
const OPPONENT = { id: idFor('ananya@loophole.test'), username: 'ananya' };
const TOTAL = 5;

io.of('/duels')
  .use((socket, next) => {
    const user = userFromToken(
      (socket.handshake.auth as { token?: string }).token,
    );
    if (!user) {
      const err = new Error('Sign in first.') as Error & { data?: unknown };
      err.data = { code: 'UNAUTHENTICATED', message: 'Sign in first.' };
      return next(err);
    }
    socket.data.user = user;
    next();
  })
  .on('connection', (socket) => {
    const user = socket.data.user as UserState;
    let duelId: string | null = null;
    let problem = duelProblem;
    // This duel's attempts, for its replay.
    let startedAt = 0;
    let events: DuelReplayEvent[] = [];

    socket.on('queue:join', (data?: QueueJoinRequest) => {
      problem = duelProblems[data?.language ?? 'python'];
      socket.emit('queue:joined', { position: 1 } satisfies QueueJoined);
      setTimeout(() => {
        duelId = randomUUID();
        socket.emit('duel:matched', {
          duelId,
          opponent: { username: OPPONENT.username, elo: 1000 },
        });
        const start: DuelStart = {
          duelId,
          problem: problemView(problem),
          endsAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        };
        socket.emit('duel:start', start);
        startedAt = Date.now();
        // The opponent's 2 / 5, sent just below.
        events = [
          {
            atMs: 400,
            who: 'opponent',
            testsPassed: 2,
            totalTests: TOTAL,
            code: null,
          },
        ];
        setTimeout(
          () =>
            socket.emit('duel:progress', {
              userId: OPPONENT.id,
              testsPassed: 2,
              totalTests: TOTAL,
            }),
          400,
        );
      }, 300);
    });

    socket.on('queue:leave', () => {
      duelId = null;
    });

    socket.on('duel:submit', (data: { duelId: string; code: string }) => {
      if (!duelId || data.duelId !== duelId) return;
      const fixed = data.code.trim() !== problem.buggyCode.trim();
      const testsPassed = fixed ? TOTAL : 1;
      const result: DuelSubmissionResult = {
        testsPassed,
        totalTests: TOTAL,
        results: Array.from({ length: TOTAL }, (_, i) => ({
          kind: 'hidden' as const,
          passed: i < testsPassed,
        })),
        stderr: '',
      };
      socket.emit('duel:result', result);
      events.push({
        atMs: Date.now() - startedAt,
        who: 'me',
        testsPassed,
        totalTests: TOTAL,
        code: data.code,
      });
      socket.emit('duel:progress', {
        userId: user.id,
        testsPassed,
        totalTests: TOTAL,
      });
      if (fixed) {
        user.rating += 16;
        user.dueled = true;
        const end: DuelEnd = {
          duelId,
          result: 'win',
          winnerId: user.id,
          ratingChange: { [user.id]: 16, [OPPONENT.id]: -16 },
        };
        socket.emit('duel:end', end);
        const durationMs = Date.now() - startedAt;
        replays.set(duelId, {
          owner: user.id,
          endedAt: new Date().toISOString(),
          replay: {
            id: duelId,
            problem: problemView(problem),
            opponent: OPPONENT.username,
            outcome: 'won',
            result: 'win',
            durationMs,
            totalTests: TOTAL,
            events: events
              .map((e) => ({ ...e, atMs: Math.min(e.atMs, durationMs) }))
              .sort((a, b) => a.atMs - b.atMs),
          },
        });
        duelId = null;
      }
    });
  });

server.listen(PORT, () => console.log(`mock backend on :${PORT}`));
