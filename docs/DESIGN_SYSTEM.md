# Loophole — Design System

Black, white and orange. Colour carries meaning, motion answers an action, and buttons feel physical.

## 1. Principles

1. **Three meanings, three colours.** Ink = done. Orange = your move now. Gray = not yet. A new colour needs a new meaning first.
2. **Motion answers an action.** Unlocks, XP gains and duel wins animate; nothing animates on page load. Two exceptions: the active node's pulse, which signals "start here", and the public landing page (`/`), where the hero, demos and section reveals animate on load and scroll to show the product in motion. Inside the app the rule holds.
3. **Chunky and physical.** Pressable things have a hard 4 px offset shadow that collapses on press.

## 2. Colour tokens

| Token            | Hex     | Use                                                           |
| ---------------- | ------- | ------------------------------------------------------------- |
| `ink`            | #171717 | Text, completed nodes, duel header band                       |
| `paper`          | #FFFFFF | Page background                                               |
| `surface`        | #EDEDED | Locked nodes, muted cards, progress-bar track                 |
| `border-muted`   | #D4D4D4 | Locked and disabled borders                                   |
| `orange`         | #FF6A00 | The only accent: active node, XP, streak, primary CTA, timers |
| `orange-dark`    | #CC5500 | Pressed and shadow shade for orange                           |
| `orange-tint`    | #FFB380 | Confetti, hover backgrounds                                   |
| `text-secondary` | #6B6B6B | Secondary text (passes AA)                                    |
| `text-tertiary`  | #8A8A8A | Large text and icons only (fails AA for small text)           |

**Contrast rules (measured):** Ink on Paper ≈ 17.9:1 · Ink on Orange ≈ 7.3:1 · White on Orange ≈ 2.9:1 (fails) — **text on orange is always Ink.**

Open decision: a muted red for failed tests only. Until decided, failed tests use Ink text with an "✕" icon; passed tests use Orange "✓".

## 3. Typography

| Token   | Font           | Size / weight / line height | Use                    |
| ------- | -------------- | --------------------------- | ---------------------- |
| display | Baloo 2        | 32 / 800 / 1.2              | Page titles            |
| h1      | Baloo 2        | 24 / 700 / 1.3              | Section titles         |
| h2      | Baloo 2        | 20 / 700 / 1.3              | Card titles            |
| body    | Nunito         | 16 / 500 / 1.5              | Default text           |
| body-sm | Nunito         | 14 / 500 / 1.5              | Labels, secondary text |
| caption | Nunito         | 12 / 600 / 1.4              | Badges, timestamps     |
| code    | JetBrains Mono | 14 / 400 / 1.6              | Editor and console     |

Load fonts with `next/font/google`.

## 4. Spacing, radius, elevation

- Spacing: Tailwind's default 4 px scale.
- Radius: nodes `9999px`, cards and buttons `16px`, badges `8px`.
- Press shadows (no blur): `press-orange` `0 4px 0 #CC5500` · `press-ink` `0 4px 0 #000` · `press-locked` `0 4px 0 #D4D4D4`. On `:active`, translate down 4 px and shadow to 0.
- Ambient shadows (`shadow-md`) only on non-clickable surfaces like modals.

## 5. Motion

| Token    | Value                                             | Use                      |
| -------- | ------------------------------------------------- | ------------------------ |
| press    | 50 ms                                             | Button press and release |
| base     | 300–500 ms                                        | Node unlock, XP count-up |
| pulse    | 1.6 s loop                                        | Active node              |
| ease-pop | `cubic-bezier(0.34, 1.56, 0.64, 1)`               | Overshoot on unlock      |
| spring   | `{ type: 'spring', stiffness: 400, damping: 15 }` | Framer Motion equivalent |

Wrap all motion in a `useReducedMotion()` check; with reduced motion, swap animations for instant state changes and skip confetti. The landing page wraps everything in `<MotionConfig reducedMotion="user">` and its looping demos show their final frame instead.

## 6. Components

| Component             | Spec                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| PrimaryButton         | Orange fill, Ink text, radius 16, `press-orange`                                                                                             |
| SecondaryButton       | Paper fill, Ink text, 1 px `border-muted`, no press shadow                                                                                   |
| LessonNode            | 64 px circle, 3 px border. Locked: Surface / border-muted / lock icon. Active: Orange / orange-dark / pulse. Done: Ink / black / white check |
| LessonPath            | Hand-built SVG; nodes zig-zag down the page, connected by a 6 px Surface path; completed segments Ink                                        |
| Card                  | Paper, radius 16, `shadow-md`, padding 24                                                                                                    |
| XpBadge / StreakBadge | Caption text, Orange icon (lightning / flame), Ink text                                                                                      |
| ProgressBar           | Surface track, Orange fill, `ease-out` width change                                                                                          |
| TestResultRow         | ✓ Orange or ✕ Ink, input / expected / actual for sample tests                                                                                |
| DuelHeader            | Ink band, white text, Orange countdown and opponent progress bar                                                                             |
| EditorPanel           | CodeMirror, light theme, JetBrains Mono 14                                                                                                   |

## 7. Tailwind config (v4, ADR-013)

Tailwind v4 has no `tailwind.config.ts`; tokens are CSS variables in `@theme` blocks. Each variable becomes utilities by its prefix: `--color-ink` → `bg-ink`, `text-ink`; `--radius-card` → `rounded-card`; `--shadow-press-orange` → `shadow-press-orange`; `--animate-pop` → `animate-pop`. Defining `--color-orange` adds `bg-orange` alongside Tailwind's built-in `orange-50`…`orange-950` scale; use only the tokens below.

```css
/* apps/web/app/globals.css — replace the create-next-app defaults */
@import 'tailwindcss';

@theme {
  --color-ink: #171717;
  --color-paper: #ffffff;
  --color-surface: #ededed;
  --color-border-muted: #d4d4d4;
  --color-orange: #ff6a00;
  --color-orange-dark: #cc5500;
  --color-orange-tint: #ffb380;
  --color-text-secondary: #6b6b6b;
  --color-text-tertiary: #8a8a8a;

  --radius-node: 9999px;
  --radius-card: 1rem;
  --radius-badge: 0.5rem;

  --shadow-press-orange: 0 4px 0 #cc5500;
  --shadow-press-ink: 0 4px 0 #000000;
  --shadow-press-locked: 0 4px 0 #d4d4d4;

  --animate-pop: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  --animate-pulse-node: pulse-node 1.6s ease-in-out infinite;

  @keyframes pop {
    0%,
    100% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.25);
    }
  }
  @keyframes pulse-node {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.06);
    }
  }
}

/* `inline` because these point at variables next/font sets on <html> */
@theme inline {
  --font-display: var(--font-baloo), sans-serif;
  --font-sans: var(--font-nunito), sans-serif;
  --font-mono: var(--font-jetbrains), monospace;
}
```

## 8. Do and don't

- Do use Orange for one thing per screen region. Don't make three orange buttons sit side by side.
- Do draw the lesson path by hand in SVG. Don't use a diagram library for it.
- Do keep the Duolingo _feel_. Don't copy Duolingo's or Coddy's assets, mascot or green palette.
