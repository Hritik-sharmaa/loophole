// A unit's badge (ADR-030): a hexagon sticker with the unit's number.
// Earned (every lesson in the unit done): Lemon, the reward colour, with a
// star. Not yet: a dashed outline, like a locked lesson node.
export function UnitBadge({
  number,
  earned,
  className = 'size-12',
}: {
  number: number;
  earned: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 52"
      className={className}
      role="img"
      aria-label={`Unit ${number} badge${earned ? ', earned' : ', not earned yet'}`}
    >
      <path
        d="M24 3 L44 14.5 L44 37.5 L24 49 L4 37.5 L4 14.5 Z"
        strokeLinejoin="round"
        strokeWidth={3}
        strokeDasharray={earned ? undefined : '4 4'}
        className={
          earned ? 'fill-lemon stroke-ink' : 'fill-paper stroke-border-muted'
        }
      />
      {earned && (
        <path
          d="M24 9.5 L25.6 12.8 L29.2 13.3 L26.6 15.8 L27.2 19.4 L24 17.7 L20.8 19.4 L21.4 15.8 L18.8 13.3 L22.4 12.8 Z"
          className="fill-orange-dark"
        />
      )}
      <text
        x="24"
        y={earned ? 37 : 32}
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        className={`font-display ${earned ? 'fill-ink' : 'fill-text-tertiary'}`}
      >
        {number}
      </text>
    </svg>
  );
}
