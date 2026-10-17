// Usernames are 3–20 chars of a-z, 0-9 and _ (docs/DATA_MODEL.md).
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Leaves room for withRandomSuffix's 4 digits within USERNAME_MAX.
const BASE_MAX = 16;

// Turns an email ("Hritik.S@gmail.com") or a display name ("Hritik Sharma")
// into a valid username base ("hritik_s", "hritik_sharma").
export function toUsernameBase(source: string): string {
  const local = source.split('@')[0];
  const cleaned = local
    .toLowerCase()
    .replace(/[\s.-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, BASE_MAX);

  if (cleaned.length === 0) return 'user';
  return cleaned.length < USERNAME_MIN ? `${cleaned}_user` : cleaned;
}

// "hritik" → "hritik4821", used when the base is already taken.
export function withRandomSuffix(base: string): string {
  const digits = Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, '0');
  return `${base.slice(0, BASE_MAX)}${digits}`;
}
