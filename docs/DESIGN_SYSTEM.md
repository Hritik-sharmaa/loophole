# Loophole — Design System

**Sticker Lab** (ADR-020). Bright stickers on a dotted cutting mat: thick Ink outlines, hard offset shadows, and a small set of loud colours that each mean one thing. The mascot is Byte, a robot with a terminal for a face.

## 1. Principles

1. **One colour, one meaning.** Orange = your move now. Blue = done. Lemon = rewards and labels. Pink = your rival. Ink = text and outlines. A new colour needs a new meaning first.
2. **Motion answers an action.** Unlocks, XP gains and duel wins animate; nothing animates on page load. Exceptions: the active node's pulse ("start here"), Byte's blinking cursor (Byte's idle sign of life), and the public landing page (`/`), where the hero, demos and section reveals animate on load and scroll to show the product in motion.
3. **Everything is a sticker.** Pressable things and main cards have a 2 px Ink outline and a hard Ink shadow with no blur. Buttons and nodes drop 4 px on press and lose the shadow.
4. **Not Duolingo.** No green, no rounded-blob cartoon style, no owl. Keep the game feel (path, XP, streaks), never its look.

## 2. Colour tokens

| Token            | Hex     | Use                                                                       |
| ---------------- | ------- | ------------------------------------------------------------------------- |
| `ink`            | #1B1433 | Text, outlines, hard shadows, duel header band, code-editor title bar     |
| `paper`          | #FFFFFF | Cards, header, inputs                                                     |
| `canvas`         | #F6F3FF | Page background (with the `dots` grid)                                    |
| `dots`           | #DDD5F5 | The page's dot grid only                                                  |
| `surface`        | #ECE7FB | Muted panels (tutor), table headers, progress-bar track                   |
| `border-muted`   | #C9C1E3 | Locked node outline, the unwalked part of the path                        |
| `orange`         | #FF6A00 | Your move: active node, primary CTA, your progress bar, duel timer on Ink |
| `orange-dark`    | #CC5500 | Icons on Lemon (flame, lightning)                                         |
| `orange-tint`    | #FFB380 | "You" rows on leaderboards                                                |
| `blue`           | #4361FF | Done: completed nodes, walked path, passed tests                          |
| `blue-tint`      | #DFE4FF | Background of a passed test row                                           |
| `lemon`          | #FFD84D | Rewards and labels: XP and streak chips, unit chips, "Start here", wins   |
| `pink`           | #FF7AB6 | Rival: opponent progress bar, duel badges                                 |
| `screen`         | #2A2147 | Byte's screen                                                             |
| `text-secondary` | #5A5275 | Secondary text (passes AA on canvas, paper and surface)                   |
| `text-tertiary`  | #8A83A3 | Large text and icons only (fails AA for small text)                       |

**Contrast rules (measured):** Ink on Paper ≈ 17:1 · Ink on Orange ≈ 6.6:1 · Ink on Lemon ≈ 12:1 · Ink on Pink ≈ 7:1 · White on Blue ≈ 4.8:1 · White on Orange ≈ 2.9:1 (fails). **Text on orange is always Ink.** Orange text is allowed only on Ink.

Open decision: a muted red for failed tests only. Until decided, failed tests use Ink text with an "✕" icon; passed tests use a Blue "✓".

## 3. Typography

| Token   | Font                | Size / weight / line height | Use                    |
| ------- | ------------------- | --------------------------- | ---------------------- |
| display | Bricolage Grotesque | 32 / 800 / 1.1              | Page titles, logo      |
| h1      | Bricolage Grotesque | 24 / 800 / 1.2              | Section titles         |
| h2      | Bricolage Grotesque | 20 / 700 / 1.3              | Card titles            |
| body    | DM Sans             | 16 / 500 / 1.5              | Default text           |
| body-sm | DM Sans             | 14 / 500 / 1.5              | Labels, secondary text |
| caption | DM Sans             | 12 / 700 / 1.4              | Chips, timestamps      |
| code    | JetBrains Mono      | 14 / 400 / 1.6              | Editor and console     |

Load fonts with `next/font/google`.

## 4. Spacing, radius, elevation

- Spacing: Tailwind's default 4 px scale.
- Radius: nodes `9999px`, cards and buttons `16px`, chips and badges `8px`.
- Outlines: `border-2 border-ink` on cards, buttons, chips and inputs; nodes use 3 px.
- Hard shadows (no blur): `press` `0 4px 0 ink` (buttons, nodes) · `press-locked` `0 4px 0 border-muted` · `sticker` `5px 5px 0 ink` (main card of a region) · `sticker-sm` `3px 3px 0 ink` (small cards, bubbles, chips that float).
- Stickers may sit at a slight angle (`-rotate-1` to `rotate-2`) on the landing page and for chips. Inside the app, cards stay straight.
- No blurred shadows anywhere.

## 5. Motion

| Token    | Value                                             | Use                       |
| -------- | ------------------------------------------------- | ------------------------- |
| press    | 50 ms                                             | Button press and release  |
| base     | 300–500 ms                                        | Node unlock, XP count-up  |
| pulse    | 1.6 s loop                                        | Active node               |
| blink    | 1.1 s steps loop                                  | Byte's cursor (idle mood) |
| ease-pop | `cubic-bezier(0.34, 1.56, 0.64, 1)`               | Overshoot on unlock       |
| spring   | `{ type: 'spring', stiffness: 400, damping: 15 }` | Framer Motion equivalent  |

Wrap all motion in a `useReducedMotion()` check; with reduced motion, swap animations for instant state changes and skip confetti. CSS loops (pulse, blink) stop through the reduced-motion rule in `globals.css`. The landing page wraps everything in `<MotionConfig reducedMotion="user">` and its looping demos show their final frame instead. Confetti uses Orange, Lemon, Blue and Pink.

## 6. Components

Shared class strings live in `components/ui/buttons.ts` (`primaryButton`, `secondaryButton`) and `components/ui/card.ts` (`stickerCard`, `flatCard`, `chip`).

| Component             | Spec                                                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PrimaryButton         | Orange fill, Ink text, Ink outline, `press` shadow                                                                                                                                                               |
| SecondaryButton       | Paper fill, Ink text, Ink outline, `press` shadow                                                                                                                                                                |
| StickerCard           | Paper, radius 16, Ink outline, `sticker` shadow. One per screen region                                                                                                                                           |
| Chip                  | Caption text, Ink outline, radius 8. Lemon for labels and rewards, Pink for duels, Blue for "the path"                                                                                                           |
| LessonNode            | 64 px circle, 3 px Ink outline. Locked: Paper / dashed border-muted / lock icon. Active: Orange / pulse / Lemon "Start here" chip. Done: Blue / white check                                                      |
| LessonPath            | Hand-built SVG; nodes zig-zag down the page on a dotted border-muted track; the walked part is solid Blue. Course header card with a progress bar and Byte                                                       |
| XpBadge / StreakBadge | Lemon chip, Orange-dark icon (lightning / flame), Ink numbers                                                                                                                                                    |
| ProgressBar           | Surface track with an Ink outline; Orange fill for you, Pink for a rival; `ease-out` width change                                                                                                                |
| TestResultRow         | Passed: Blue-tint row, Blue ✓. Failed: Paper row, Ink ✕, input / expected / actual for sample tests. Error output is an Ink "terminal" block                                                                     |
| DuelHeader            | Ink band with `sticker` shadow, white text, Orange countdown, Pink opponent bar                                                                                                                                  |
| EditorPanel           | Sticker card; Ink title bar with three dots (Orange, Lemon, Pink) and the file name; CodeMirror light theme, JetBrains Mono 14                                                                                   |
| ByteSays              | Byte beside a Paper speech bubble with a tail; used for the lesson task                                                                                                                                          |
| LessonStepper         | Learn · Check · Practice as three outlined tabs. Current: Ink; passed: Blue with a check; ahead: Paper. Any step can be opened (ADR-021)                                                                         |
| LearnCards            | Sticker card, one card at a time: Lemon "Card n of m" chip, progress dots (walked Blue, current Orange pill), title, body, RunnableExample; Back / Next                                                          |
| RunnableExample       | Compact EditorPanel (no shadow), secondary "Run it" button, Ink console labelled "Prints" (the content's output) until run, then "Output" (stderr in Pink)                                                       |
| QuickCheck            | Sticker card with Byte (thinking → oops → happy), Lemon chip, Ink code block, A–D options with press shadows. Right: Blue-tint ✓; wrong: struck through ✕                                                        |
| AppHeader (phone)     | Below `sm`: the top bar keeps the logo and streak/XP chips; links move to a fixed bottom tab bar (icon + short label, current tab Ink); page bottom padded                                                       |
| WebPreview            | Outlined Paper panel, Surface "Live preview" bar with a Blue dot, white `<iframe sandbox="">`; redraws 300 ms after typing stops (ADR-024)                                                                       |
| Checklist             | Web exercises: "Your page must", one outlined row per check. Before checking: dashed empty circle; then Blue-tint ✓ or Paper ✕. CSS errors in an Ink block                                                       |
| Terminal              | Git exercises (ADR-026): Ink sticker card, "Terminal · practice mode" bar; `$ command` lines (Orange `$`), output in border-muted, Orange prompt `you@loophole:~/folder$`. ↑/↓ recall, `clear` clears the screen |

**Web lessons** use a `max-w-5xl` page with the editor and WebPreview side by side from `lg` (stacked below), while Learn cards and the quick check keep a `max-w-3xl` reading width. Code never shows font ligatures (`font-variant-ligatures: none`), so `<!--` and `>=` read as typed.

**Responsive rules:** design at 390 px first. Page gutters are 16 px on phones and 24 px from `sm`. Fixed and sticky bars pad themselves with `env(safe-area-inset-*)`; the viewport uses `viewport-fit=cover` for the installed PWA (ADR-022).

## 7. Tailwind config (v4, ADR-013)

Tailwind v4 has no `tailwind.config.ts`; tokens are CSS variables in `@theme` blocks in `apps/web/app/globals.css`. Each variable becomes utilities by its prefix: `--color-ink` → `bg-ink`, `text-ink`, `fill-ink`, `stroke-ink`; `--radius-card` → `rounded-card`; `--shadow-sticker` → `shadow-sticker`; `--animate-blink` → `animate-blink`. Defining `--color-orange` and `--color-blue` adds `bg-orange` and `bg-blue` alongside Tailwind's built-in `orange-50`…`950` and `blue-50`…`950` scales; use only the tokens in §2.

`globals.css` is the source of truth for exact values. Fonts map through `@theme inline`: `--font-display` → `--font-bricolage`, `--font-sans` → `--font-dm-sans`, `--font-mono` → `--font-jetbrains`. The body draws the dot grid with a `radial-gradient` of `--color-dots` on `--color-canvas`, 22 px apart.

## 8. Do and don't

- Do use Orange for one thing per screen region. Don't put three orange buttons side by side.
- Do give a region one sticker card; nested blocks use `flatCard` or a Surface panel.
- Do draw the lesson path and Byte by hand in SVG. Don't use a diagram library or an icon pack for them.
- Don't copy Duolingo's or Coddy's assets, mascot, green palette or rounded-blob style.

## 9. Brand: Byte and the logo

**Byte** is a small robot whose head is a terminal (`components/byte.tsx`). Antenna with an Orange ball, Ink head, `screen`-coloured display, two Ink feet. Its face is drawn on the screen:

| Mood       | Face                          | Use                                                        |
| ---------- | ----------------------------- | ---------------------------------------------------------- |
| `idle`     | `>` and a blinking `_` cursor | Default; course header, tutor panel at rest                |
| `happy`    | `^ ^` with Pink cheeks        | Lesson complete, duel won, certificate, profile, final CTA |
| `thinking` | three Lemon dots              | Tutor working, waiting in the duel queue, empty boards     |
| `oops`     | `> <`                         | Errors, lost duels, the bug in the landing demo            |

Byte voices the AI tutor ("Stuck? Ask Byte") and reads out each lesson's task in a `ByteSays` bubble. Pass `label` only when Byte carries meaning on its own; otherwise it is decorative and hidden from screen readers.

**Logo** (`components/logo.tsx`): Byte's head (`variant="mark"`, no feet) followed by the wordmark "loophole" in Bricolage Grotesque 800, all lowercase, Ink. **App icon** (`apps/web/app/icon.svg`): Byte's screen alone on an Ink rounded square, sized for a browser tab.
