// Card styles from docs/DESIGN_SYSTEM.md §6. A sticker card is the main
// object on a screen region; a flat card is a quieter block inside one.

// Outline and shadow only. Use it with your own background (bg-lemon for a
// win or a "continue" card): adding a second bg-* class to stickerCard
// does not reliably win, because Tailwind's CSS order decides, not the
// class order.
export const stickerOutline = 'rounded-card border-2 border-ink shadow-sticker';

export const stickerCard = `${stickerOutline} bg-paper`;

export const flatCard = 'rounded-card border-2 border-ink bg-paper';

// Small label chips ("Unit 1", "Start here", streak and XP).
export const chip =
  'inline-flex items-center gap-1 rounded-badge border-2 border-ink px-2 py-0.5 text-xs font-bold';
