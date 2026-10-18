// ProgressBar from docs/DESIGN_SYSTEM.md §6: Surface track, Orange fill,
// ease-out width change.
export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-3 w-full overflow-hidden rounded-node bg-surface"
    >
      <div
        className="h-full rounded-node bg-orange transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
