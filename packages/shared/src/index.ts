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

// GET /submissions?exerciseId= (newest first, at most 10)
export type SubmissionSummary = {
  id: string;
  status: SubmissionStatus;
  testsPassed: number;
  totalTests: number;
  code: string;
  submittedAt: string;
};
