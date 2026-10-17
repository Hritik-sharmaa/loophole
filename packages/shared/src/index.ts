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
