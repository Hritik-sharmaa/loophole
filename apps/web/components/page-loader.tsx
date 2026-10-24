import { LoopMark } from './logo';

// The loading screen for a page or a page's data: the loop logo drawing
// itself, and what is loading. `fill` centres it in the whole window
// (app/loading.tsx); otherwise it sits in the page under the header.
export function PageLoader({
  label = 'Loading…',
  fill = false,
}: {
  label?: string;
  fill?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-4 ${fill ? 'min-h-dvh flex-1' : 'py-24'}`}
    >
      <LoopMark drawing className="size-14 rounded-[17px] shadow-sun" />
      <p className="text-sm font-bold text-text-secondary">{label}</p>
    </div>
  );
}
