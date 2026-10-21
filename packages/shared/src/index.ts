// Types shared by apps/web and apps/api live here.

// Every error response from the API (docs/API_SPEC.md "Conventions").
export type ApiErrorBody = {
  error: { code: string; message: string };
};

// XP a day the learner aims for (ADR-033): 10, 20 or 30, about one, two
// or three lessons (5, 10 or 15 minutes).
export type DailyGoal = 10 | 20 | 30;

// GET /me and PATCH /me
export type MeResponse = {
  id: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  streak: { current: number; longest: number; freezes: number };
  rating: number;
  lessonsCompleted: number;
  // null until the learner picks one in the welcome (ADR-033).
  dailyGoal: DailyGoal | null;
  // XP earned since 00:00 IST today.
  todayXp: number;
};

// PATCH /me body
export type UpdateMeRequest = {
  username?: string;
  avatarUrl?: string;
  dailyGoal?: DailyGoal;
};

// GET /me/activity (ADR-033): XP per IST day for the streak calendar, the
// five weeks from `from` (a Monday) to `today`. Days without XP are left
// out.
export type ActivityResponse = {
  from: string;
  today: string;
  days: { date: string; xp: number }[];
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

// GET /courses: one catalog card per course, with the user's progress.
// Courses the user has started come first, most recent first (ADR-023).
export type CourseOverview = CourseSummary & {
  description: string;
  lessonCount: number;
  completedCount: number;
  // When the user last completed a lesson in it; null if never.
  lastActivityAt: string | null;
};

export type LessonState = 'locked' | 'active' | 'completed';

// GET /courses/:slug/path
export type CoursePath = {
  course: CourseSummary;
  units: {
    id: string;
    title: string;
    lessons: { id: string; title: string; state: LessonState }[];
    // How many bug cards the unit has: its Bug hunt's length (ADR-031).
    bugs: number;
  }[];
  // The user's certificate for this course (/c/<slug>), once earned:
  // the path's last stop links to it (ADR-030).
  certificateSlug: string | null;
};

// GET /courses/:slug/units/:unitId/cheatsheet (ADR-030): a unit's Learn
// cards gathered into one page, lesson by lesson. Only the teaching cards:
// no quick checks, no exercises.
// GET /courses/:slug/units/:unitId/bug-hunt (ADR-031): every bug card in
// a unit, for the review at the end of the unit. Ungraded; no XP.
// GET /courses/:slug/practice (ADR-037): a mixed review from the lessons
// the learner has finished: their quick checks and spot-the-bug cards,
// older lessons more often. Ungraded; no XP. Empty until a lesson is done.
export type PracticeItem =
  | { kind: 'check'; lesson: string; check: QuickCheck }
  | {
      kind: 'bug';
      lesson: string;
      body: string;
      code: string;
      bug: { line: number; fix: string };
    };
export type PracticeSet = { course: CourseSummary; items: PracticeItem[] };

export type UnitBugHunt = {
  unitId: string;
  title: string;
  bugs: {
    lesson: string;
    title: string;
    body: string;
    code: string;
    bug: { line: number; fix: string };
  }[];
};

export type UnitCheatSheet = {
  unitId: string;
  title: string;
  lessons: {
    title: string;
    cards: { title: string; body: string; code?: string }[];
  }[];
};

// One teaching card in a lesson's Learn step (docs/CONTENT_GUIDE.md §3).
// `code`, `input` and `output` come together: an example the learner can
// read, edit and run; `output` is what the unedited example prints.
export type LearnCard = {
  title: string;
  body: string;
  code?: string;
  input?: string;
  output?: string;
  // A spot-the-bug card (ADR-031): `code` has one wrong line (1-based)
  // for the learner to tap; `fix` says what's wrong. Never run, so it
  // has no input or output. Ungraded, like the quick check.
  bug?: { line: number; fix: string };
};

// The ungraded quick check after the cards. It pays no XP and records
// nothing, so its answer may travel to the browser (ADR-021).
export type QuickCheck = {
  question: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type LessonLearn = { cards: LearnCard[]; check: QuickCheck };

// How an exercise is graded (ADR-024). "program": run in Piston, stdout
// compared with tests. "web": an HTML page (with its CSS in <style>) that
// the API parses and checks against rules; nothing is run.
// "git" (ADR-026): commands typed into a simulated terminal, replayed on a
// simulated repository, then checked against rules about its state.
export type ExerciseKind = 'program' | 'web' | 'git';

// One rule about the simulated repository at the end of a git exercise
// (ADR-026). It looks at the folder the learner ends in. `branch` defaults
// to the current one. `label` is what the learner sees.
export type GitCheck =
  | { type: 'repo'; label: string }
  | { type: 'config'; label: string; key: 'user.name' | 'user.email' }
  | { type: 'file'; label: string; path: string; content?: string }
  | { type: 'folder'; label: string; path: string }
  | { type: 'staged'; label: string; path: string; staged?: boolean }
  | { type: 'clean'; label: string }
  | { type: 'commits'; label: string; min: number; branch?: string }
  | { type: 'commit-message'; label: string; text: string; branch?: string }
  | {
      type: 'committed-file';
      label: string;
      path: string;
      content?: string;
      present?: boolean;
      branch?: string;
    }
  | { type: 'branch'; label: string; name: string; exists?: boolean }
  | { type: 'current-branch'; label: string; name: string }
  | { type: 'merged'; label: string; branch: string; into: string }
  | { type: 'remote'; label: string; name: string; url?: string }
  | { type: 'pushed'; label: string; remote: string; branch: string };

// A git exercise: hidden setup commands that build the starting state,
// then the checks.
export type GitScenario = { setup: string[]; checks: GitCheck[] };

// POST /git/run: replay a git lesson's terminal. `fresh` starts from an
// empty folder (a Learn example) instead of the exercise's setup.
export type GitRunRequest = {
  lessonId: string;
  commands: string;
  fresh?: boolean;
};
export type GitTranscriptLine = { command: string; output: string };
export type GitRunResponse = {
  transcript: GitTranscriptLine[];
  // The folder the terminal ends in, for its prompt ("" is home).
  cwd: string;
};

// One rule a web exercise's page must meet. `label` is what the learner
// sees in the checklist. Selectors are CSS selectors.
export type WebCheck =
  | {
      type: 'element';
      label: string;
      selector: string;
      // At least this many matches (default 1).
      min?: number;
      // Only count elements whose text, whitespace collapsed, is exactly this.
      text?: string;
    }
  | {
      type: 'attribute';
      label: string;
      selector: string;
      name: string;
      // Any value when left out.
      value?: string;
    }
  | {
      type: 'style';
      label: string;
      selector: string;
      property: string;
      // Accepted values, e.g. ["orange", "#ffa500"].
      value: string | string[];
    };

// GET /lessons/:id. Sample tests only; hidden tests never leave the server.
// `learn` is null for a lesson without a Learn step.
export type LessonDetail = {
  id: string;
  title: string;
  // The course it belongs to: the way back to its path, and its language
  // for the editor's highlighting and file name.
  course: { slug: string; title: string; language: string };
  learn: LessonLearn | null;
  exercise: {
    id: string;
    kind: ExerciseKind;
    prompt: string;
    starterCode: string;
    // Program exercises: the examples. Empty for web exercises.
    sampleTests: TestCase[];
    // Web exercises: the checklist, all visible. Empty for programs.
    checks: string[];
  };
};

// POST /runs: run code once in a lesson's language, ungraded. For the Learn
// step's examples; nothing is stored and no XP is paid.
export type RunRequest = { lessonId: string; code: string; input?: string };
export type RunResponse = {
  stdout: string;
  stderr: string;
  timedOut: boolean;
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
  | { kind: 'hidden'; passed: boolean }
  // A web exercise's rule (ADR-024); its label is already public.
  | { kind: 'check'; passed: boolean; label: string };

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
  // Set only by the submission that finished the whole course (FR-15):
  // the new certificate's /c/<slug>.
  certificateSlug: string | null;
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

// POST /ai/explain-card (ADR-036): explain one Learn card again in other
// words. `card` is its index in the lesson's cards; the server reads the
// card itself. Teaching cards only, not spot-the-bug cards.
export type ExplainCardRequest = { lessonId: string; card: number };
export type ExplainCardResponse = {
  explanation: string;
  remainingToday: number;
};

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

// ---- Bug of the day (FR-28, ADR-035) ----

// The caller's play of today's bug. The clock starts on their first
// GET /bug-of-the-day of the IST day; `timeMs` is set once solved.
export type DailyBugPlay = {
  openedAt: string;
  solvedAt: string | null;
  timeMs: number | null;
  attempts: number;
};

// GET /bug-of-the-day. Sample tests only; hidden tests never leave the
// server (hard rule 2).
export type DailyBugToday = {
  // The IST day, "YYYY-MM-DD"; a new bug starts at 00:00 IST.
  day: string;
  problem: {
    title: string;
    description: string;
    buggyCode: string;
    sampleTests: TestCase[];
  };
  me: DailyBugPlay;
};

// GET /bug-of-the-day/board: today's fastest solves, plus the caller's.
// Opening the board does not start the caller's clock.
export type DailyBugBoard = {
  day: string;
  title: string;
  // How many learners have solved today's bug.
  solvers: number;
  entries: {
    rank: number;
    userId: string;
    username: string;
    timeMs: number;
    attempts: number;
  }[];
  // null until the caller solves it.
  me: { rank: number; timeMs: number } | null;
  // Whether the caller has opened today's bug (their clock is running).
  started: boolean;
};

// POST /bug-of-the-day/submissions
export type DailyBugSubmitRequest = { code: string };

// The graded attempt; hidden tests report only pass/fail.
export type DailyBugResult = {
  status: SubmissionStatus;
  testsPassed: number;
  totalTests: number;
  results: TestResult[];
  stderr: string;
  // True once today's bug is solved, by this attempt or an earlier one.
  solved: boolean;
  // 20 for the first solve of the day, 0 after.
  xpAwarded: number;
  timeMs: number | null;
  // Place on today's board; null until solved.
  rank: number | null;
  solvers: number;
};

// ---- Certificates (FR-15) ----

// GET /certificates — the signed-in user's own.
export type CertificateSummary = {
  slug: string;
  courseTitle: string;
  issuedAt: string;
};

// GET /certificates/:slug — public, no login; what /c/:slug shows.
export type PublicCertificate = {
  username: string;
  courseTitle: string;
  issuedAt: string;
};
