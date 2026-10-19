// Button styles from docs/DESIGN_SYSTEM.md §6, shared by <button> and <Link>.
// Every button is a sticker: Ink outline and a hard Ink shadow that
// collapses on press. Text on orange is always Ink (AGENTS.md rule 8).

const base =
  'inline-flex items-center justify-center gap-2 rounded-card border-2 border-ink px-6 py-3 font-bold shadow-press transition-[translate,box-shadow] duration-[50ms] active:translate-y-1 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-press';

export const primaryButton = `${base} bg-orange text-ink`;

export const secondaryButton = `${base} bg-paper text-ink`;
