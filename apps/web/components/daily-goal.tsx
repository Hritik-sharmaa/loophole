import type { ActivityResponse, DailyGoal } from '@loophole/shared';
import { Check } from 'lucide-react';

// The daily goal (ADR-033): XP a day, shown as lessons and minutes. One
// lesson pays 10 XP (ADR-012).
export const DAILY_GOALS: {
  xp: DailyGoal;
  label: string;
  detail: string;
}[] = [
  { xp: 10, label: 'Casual', detail: '5 min a day · 1 lesson' },
  { xp: 20, label: 'Regular', detail: '10 min a day · 2 lessons' },
  { xp: 30, label: 'Serious', detail: '15 min a day · 3 lessons' },
];

const LESSON_XP = 10;

// Lessons still to do today, rounded up.
export function lessonsLeft(todayXp: number, goal: number): number {
  return Math.max(0, Math.ceil((goal - todayXp) / LESSON_XP));
}

// A ring that fills in Orange (your progress) and turns Blue with a tick
// once the goal is met (Blue = done, DESIGN_SYSTEM §2). Decorative: the
// numbers always sit next to it.
export function GoalRing({
  value,
  goal,
  className = 'size-5',
}: {
  value: number;
  goal: number;
  className?: string;
}) {
  const met = value >= goal;
  const circumference = 2 * Math.PI * 9;
  const filled = Math.min(1, value / goal) * circumference;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle
        cx="12"
        cy="12"
        r="9"
        strokeWidth={3.5}
        className={met ? 'fill-blue stroke-blue' : 'fill-none stroke-surface'}
      />
      {!met && value > 0 && (
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 12 12)"
          className="stroke-orange"
        />
      )}
      {met && (
        <path
          d="M7.5 12.5 L10.5 15.5 L16.5 9"
          fill="none"
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-paper"
        />
      )}
    </svg>
  );
}

// The three goals as big pressable rows; the chosen one is Ink.
export function GoalPicker({
  value,
  onPick,
  disabled = false,
}: {
  value: DailyGoal | null;
  onPick: (goal: DailyGoal) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Daily goal">
      {DAILY_GOALS.map((g) => {
        const chosen = value === g.xp;
        return (
          <li key={g.xp}>
            <button
              type="button"
              onClick={() => onPick(g.xp)}
              disabled={disabled}
              aria-pressed={chosen}
              className={`flex w-full items-center justify-between gap-3 rounded-card border-2 border-ink px-5 py-4 text-left transition-[translate,box-shadow] duration-[50ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${chosen ? 'bg-ink text-paper' : 'bg-paper text-ink shadow-press active:translate-y-1 active:shadow-none'}`}
            >
              <span className="flex flex-col">
                <span className="font-display text-xl font-extrabold">
                  {g.label}
                  {g.xp === 20 && (
                    <span
                      className={`ml-2 rounded-badge border-2 px-1.5 py-0.5 align-middle font-sans text-xs font-bold ${chosen ? 'border-paper' : 'border-ink bg-lemon'}`}
                    >
                      Recommended
                    </span>
                  )}
                </span>
                <span
                  className={`text-sm font-bold ${chosen ? 'text-border-muted' : 'text-text-secondary'}`}
                >
                  {g.detail}
                </span>
              </span>
              <span className="font-display text-lg font-extrabold tabular-nums">
                {g.xp} XP
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// "YYYY-MM-DD" plus n days, in plain calendar days (no time zones: the
// server already gave IST dates).
function plusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Five weeks of days, Monday first (ADR-033). Goal met: Blue with a tick.
// Some XP: Blue-tint. None: Paper. Today: an Orange ring. Days still to
// come are left faint.
export function StreakCalendar({
  activity,
  goal,
}: {
  activity: ActivityResponse;
  goal: DailyGoal | null;
}) {
  const xpByDay = new Map(activity.days.map((d) => [d.date, d.xp]));
  const days = Array.from({ length: 35 }, (_, i) => plusDays(activity.from, i));

  return (
    <div className="flex flex-col gap-1.5">
      <ol className="grid grid-cols-7 gap-1.5" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <li
            key={i}
            className="text-center text-xs font-bold text-text-secondary"
          >
            {d}
          </li>
        ))}
      </ol>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((date) => {
          const xp = xpByDay.get(date) ?? 0;
          const future = date > activity.today;
          const met = goal === null ? xp > 0 : xp >= goal;
          const today = date === activity.today;
          const day = Number(date.slice(8));
          const label = new Date(`${date}T00:00:00Z`).toLocaleDateString(
            'en-IN',
            { day: 'numeric', month: 'long', timeZone: 'UTC' },
          );
          return (
            <li
              key={date}
              aria-label={
                future
                  ? `${label}: still to come`
                  : `${label}: ${xp} XP${met ? ', goal met' : ''}${today ? ', today' : ''}`
              }
              className={`flex aspect-square items-center justify-center rounded-badge border-2 text-xs font-bold tabular-nums ${
                future
                  ? 'border-dashed border-border-muted text-text-tertiary'
                  : met
                    ? 'border-ink bg-blue text-paper'
                    : xp > 0
                      ? 'border-ink bg-blue-tint text-ink'
                      : 'border-border-muted bg-paper text-text-secondary'
              } ${today ? 'outline-3 outline-offset-1 outline-orange' : ''}`}
            >
              {met && !future ? (
                <Check className="size-4" strokeWidth={3.5} aria-hidden />
              ) : (
                day
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
