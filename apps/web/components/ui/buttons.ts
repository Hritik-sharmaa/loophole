// Button styles from docs/DESIGN_SYSTEM.md §6, shared by <button> and <Link>.
// Every button is a pill. The primary one is Sunflower with a soft golden
// shadow; it shrinks a little on press. Text on Sunflower is always Ink,
// never white (AGENTS.md rule 8).

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold transition-[scale,box-shadow,background-color] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:opacity-50 disabled:active:scale-100';

export const primaryButton = `${base} bg-sun text-ink shadow-sun hover:bg-[#ffcb3d]`;

export const secondaryButton = `${base} border border-border-muted bg-paper text-ink hover:border-violet`;
