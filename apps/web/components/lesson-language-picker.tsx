'use client';

import type { LessonLanguage } from '@loophole/shared';

// The course languages whose lessons have Hinglish (ADR-042): all four
// today. A new course shows English until its Hinglish lands. Matches content/: the loader
// and content-files.spec.ts check every lesson of these courses.
export const HINGLISH_COURSES = ['python', 'javascript', 'html', 'git'];

// The two lesson languages (ADR-042), each with a line from the first
// Python lesson so the learner sees what they are choosing.
const LANGUAGES: { id: LessonLanguage; label: string; sample: string }[] = [
  {
    id: 'en',
    label: 'English',
    sample: 'Text in Python is called a string.',
  },
  {
    id: 'hinglish',
    label: 'Hinglish',
    sample: 'Python mein text ko string kehte hain.',
  },
];

// English / Hinglish, in the welcome and on the profile. Styled like the
// GoalPicker: the picked one is Ink.
export function LessonLanguagePicker({
  value,
  onPick,
  disabled = false,
}: {
  value: LessonLanguage;
  onPick: (language: LessonLanguage) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Lesson language">
      {LANGUAGES.map((l) => {
        const chosen = value === l.id;
        return (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onPick(l.id)}
              disabled={disabled}
              aria-pressed={chosen}
              className={`flex w-full flex-col gap-1 rounded-card border-2 border-ink px-5 py-4 text-left transition-[translate,box-shadow] duration-[50ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${chosen ? 'bg-ink text-paper' : 'bg-paper text-ink shadow-press active:translate-y-1 active:shadow-none'}`}
            >
              <span className="font-display text-xl font-extrabold">
                {l.label}
              </span>
              <span
                className={`text-sm font-bold ${chosen ? 'text-border-muted' : 'text-text-secondary'}`}
              >
                “{l.sample}”
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
