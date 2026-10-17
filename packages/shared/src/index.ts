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
