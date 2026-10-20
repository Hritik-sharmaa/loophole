// Byte (docs/DESIGN_SYSTEM.md §9): a small robot whose face is a
// terminal. Since the crew arrived (ADR-028) Byte is the logo and app icon
// only. Its eyes are a `>_` prompt; the mood changes the
// screen. Hand-drawn SVG, coloured from the design tokens.

export type ByteMood = 'idle' | 'happy' | 'thinking' | 'oops';

const EYE = 'fill-none stroke-orange';

function Screen({ mood }: { mood: ByteMood }) {
  switch (mood) {
    case 'happy':
      return (
        <>
          <path
            d="M36 66 L45 55 L54 66 M66 66 L75 55 L84 66"
            className={EYE}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={35} cy={75} r={4} className="fill-pink" />
          <circle cx={85} cy={75} r={4} className="fill-pink" />
        </>
      );
    case 'thinking':
      return (
        <>
          <circle cx={44} cy={61} r={4.5} className="fill-lemon" />
          <circle cx={60} cy={61} r={4.5} className="fill-lemon" />
          <circle cx={76} cy={61} r={4.5} className="fill-lemon" />
        </>
      );
    case 'oops':
      return (
        <path
          d="M38 52 L48 60 L38 68 M82 52 L72 60 L82 68"
          className={EYE}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      return (
        <>
          <path
            d="M38 52 L48 60 L38 68"
            className={EYE}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* The blinking cursor: Byte's one idle motion. */}
          <rect
            x={60}
            y={63}
            width={20}
            height={6}
            rx={2}
            className="animate-blink fill-orange"
          />
        </>
      );
  }
}

// `mark` drops the feet and crops tight: the logo and small avatars.
// Pass `label` when Byte means something on its own; otherwise it is
// decoration and hidden from screen readers.
export function Byte({
  mood = 'idle',
  variant = 'full',
  className = 'size-24',
  label,
}: {
  mood?: ByteMood;
  variant?: 'full' | 'mark';
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox={variant === 'mark' ? '12 4 96 96' : '0 0 120 120'}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <line
        x1={60}
        y1={30}
        x2={60}
        y2={15}
        className="stroke-ink"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle
        cx={60}
        cy={13}
        r={6}
        className="fill-orange stroke-ink"
        strokeWidth={3}
      />
      <rect x={18} y={30} width={84} height={66} rx={18} className="fill-ink" />
      <rect
        x={27}
        y={39}
        width={66}
        height={44}
        rx={10}
        className="fill-screen"
      />
      <Screen mood={mood} />
      {variant === 'full' && (
        <>
          <rect
            x={40}
            y={96}
            width={14}
            height={10}
            rx={3}
            className="fill-ink"
          />
          <rect
            x={66}
            y={96}
            width={14}
            height={10}
            rx={3}
            className="fill-ink"
          />
        </>
      )}
    </svg>
  );
}
