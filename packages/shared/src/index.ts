// Types shared by apps/web and apps/api live here.

// Every error response from the API (docs/API_SPEC.md "Conventions").
export type ApiErrorBody = {
  error: { code: string; message: string };
};

// GET /me and PATCH /me
export type MeResponse = {
  id: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  streak: { current: number; longest: number; freezes: number };
  rating: number;
  lessonsCompleted: number;
};

// PATCH /me body
export type UpdateMeRequest = {
  username?: string;
  avatarUrl?: string;
};

// One stdin → expected stdout pair (docs/CONTENT_GUIDE.md "Grading rule").
export type TestCase = { input: string; expectedOutput: string };

// GET /courses
export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  language: string;
};

export type LessonState = 'locked' | 'active' | 'completed';

// GET /courses/:slug/path
export type CoursePath = {
  course: CourseSummary;
  units: {
    id: string;
    title: string;
    lessons: { id: string; title: string; state: LessonState }[];
  }[];
};

// GET /lessons/:id. Sample tests only; hidden tests never leave the server.
export type LessonDetail = {
  id: string;
  title: string;
  exercise: {
    id: string;
    prompt: string;
    starterCode: string;
    sampleTests: TestCase[];
  };
};

// POST /submissions body. Test cases are never sent; the server looks them up.
export type CreateSubmissionRequest = { exerciseId: string; code: string };

export type SubmissionStatus = 'passed' | 'failed' | 'error';

// One test's outcome. Hidden tests report only whether they passed.
export type TestResult =
  | {
      kind: 'sample';
      passed: boolean;
      input: string;
      expected: string;
      actual: string;
    }
  | { kind: 'hidden'; passed: boolean };

// POST /submissions response
export type SubmissionResult = {
  id: string;
  status: SubmissionStatus;
  testsPassed: number;
  totalTests: number;
  // True when every test passed, so the lesson is (now) complete.
  lessonCompleted: boolean;
  // 10 the first time a lesson is completed, 0 on any later pass.
  xpAwarded: number;
  results: TestResult[];
  stderr: string;
};

// GET /leaderboard/weekly. XP earned since Monday 00:00 IST (FR-11).
// Equal XP shares a rank (1, 1, 3). `me.rank` is null with no XP this week.
export type WeeklyLeaderboard = {
  weekStart: string;
  entries: { rank: number; userId: string; username: string; xp: number }[];
  me: { rank: number | null; xp: number };
};

// GET /leaderboard/rating. Duel Elo, highest first (FR-24). Only players
// who have finished a duel are listed; `me.rank` is null until then.
export type RatingLeaderboard = {
  entries: { rank: number; userId: string; username: string; elo: number }[];
  me: { rank: number | null; elo: number };
};

// GET /submissions?exerciseId= (newest first, at most 10)
export type SubmissionSummary = {
  id: string;
  status: SubmissionStatus;
  testsPassed: number;
  totalTests: number;
  code: string;
  submittedAt: string;
};

// POST /ai/explain. The server loads the code, failing example and stderr.
export type ExplainRequest = { submissionId: string };
export type ExplainResponse = {
  explanation: string;
  // 1-based line in the submitted code, when the tutor can point at one.
  line: number | null;
  remainingToday: number;
};

// POST /ai/hint, for the code currently in the editor.
export type HintRequest = { exerciseId: string; code: string };
export type HintResponse = { hint: string; remainingToday: number };

// ---- Duels (S7), Socket.io namespace /duels (docs/API_SPEC.md) ----

export type DuelStatus = 'matched' | 'in_progress' | 'completed';
export type DuelResultKind = 'win' | 'draw' | 'forfeit';

// Client → server
export type DuelSubmitRequest = { duelId: string; code: string };
export type DuelForfeitRequest = { duelId: string };

// Server → client
export type QueueJoined = { position: number };
export type DuelMatched = {
  duelId: string;
  opponent: { username: string; elo: number };
};
// Sample tests only; hidden tests never leave the server.
export type DuelStart = {
  duelId: string;
  problem: {
    title: string;
    description: string;
    buggyCode: string;
    sampleTests: TestCase[];
  };
  // ISO timestamp the client counts down to (FR-19).
  endsAt: string;
};
export type DuelProgress = {
  userId: string;
  testsPassed: number;
  totalTests: number;
};
// To the submitter only. Hidden tests report only pass/fail.
export type DuelSubmissionResult = {
  testsPassed: number;
  totalTests: number;
  results: TestResult[];
  stderr: string;
};
export type DuelEnd = {
  duelId: string;
  result: DuelResultKind;
  // null for a draw.
  winnerId: string | null;
  // Elo change per player (S8), e.g. { [winnerId]: 16, [loserId]: -16 }.
  ratingChange: Record<string, number>;
};
// FR-23: a player's last tab closed (connected: false; they forfeit in
// 30 s) or came back (connected: true). Sent to the duel room.
export type DuelOpponentStatus = { userId: string; connected: boolean };
export type SocketError = { code: string; message: string };
