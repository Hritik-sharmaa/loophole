// Button styles from docs/DESIGN_SYSTEM.md §6, shared by <button> and <Link>.
// Text on orange is always Ink (AGENTS.md rule 8).

const base =
  'inline-flex items-center justify-center gap-2 rounded-card px-6 py-3 font-bold transition-transform duration-[50ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50';

export const primaryButton = `${base} bg-orange text-ink shadow-press-orange active:translate-y-1 active:shadow-none`;

export const secondaryButton = `${base} border border-border-muted bg-paper text-ink`;

// Paper button for dark (Ink) backgrounds.
export const invertedButton = `${base} bg-paper text-ink shadow-press-locked active:translate-y-1 active:shadow-none`;
