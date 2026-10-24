// ProgressBar from docs/DESIGN_SYSTEM.md §6: Ink-outlined Surface track,
// ease-out width change. Orange for your own progress, Pink for a rival's.
export function ProgressBar({
  value,
  max,
  label,
  tone = 'orange',
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'orange' | 'pink';
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-4 w-full overflow-hidden rounded-node border border-border-muted bg-surface"
    >
      <div
        className={`h-full rounded-node transition-[width] duration-300 ease-out motion-reduce:transition-none ${tone === 'pink' ? 'bg-pink' : 'bg-sun'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
