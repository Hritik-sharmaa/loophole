'use client';

import confetti from 'canvas-confetti';

// Confetti for a first lesson completion or a duel win (DESIGN_SYSTEM §5:
// motion answers an action). Skipped entirely with reduced motion.
export function celebrate(): void {
  if (
    typeof window === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }
  // Sticker colours from the design tokens, not hard-coded hex.
  const styles = getComputedStyle(document.documentElement);
  const colors = [
    '--color-orange',
    '--color-lemon',
    '--color-blue',
    '--color-pink',
  ]
    .map((token) => styles.getPropertyValue(token).trim())
    .filter(Boolean);

  void confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.65 },
    colors,
    disableForReducedMotion: true,
  });
}
