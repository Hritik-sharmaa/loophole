'use client';

import type { DuelLanguage } from '@loophole/shared';
import { useState } from 'react';
import { LanguageLogo } from '@/components/language-logo';

// The duel pools (ADR-040). Each is a folder in content/duels/.
export const DUEL_LANGUAGES: { id: DuelLanguage; name: string }[] = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
];

export const duelLanguageName = (id: DuelLanguage) =>
  DUEL_LANGUAGES.find((l) => l.id === id)?.name ?? id;

// The last language picked, in this browser only. Storage can be
// unavailable (private mode, blocked site data); then it is Python.
const KEY = 'loophole:duel-language';

function readLanguage(): DuelLanguage {
  try {
    const saved = window.localStorage.getItem(KEY);
    return DUEL_LANGUAGES.some((l) => l.id === saved)
      ? (saved as DuelLanguage)
      : 'python';
  } catch {
    return 'python';
  }
}

// The picked duel language, remembered across visits. Read on first
// render, so only use it in a page that renders on the client.
export function useDuelLanguage(): [DuelLanguage, (l: DuelLanguage) => void] {
  const [language, setLanguage] = useState<DuelLanguage>(() =>
    typeof window === 'undefined' ? 'python' : readLanguage(),
  );
  function pick(next: DuelLanguage) {
    setLanguage(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable: remember it for this visit only.
    }
  }
  return [language, pick];
}

// "Duel in: Python | JavaScript" at the top of the duels page. Both the
// live queue and the crew races use the pick.
export function DuelLanguagePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: DuelLanguage;
  onChange: (language: DuelLanguage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p id="duel-language" className="font-bold">
        Duel in
      </p>
      <div
        role="radiogroup"
        aria-labelledby="duel-language"
        className="flex flex-wrap gap-3"
      >
        {DUEL_LANGUAGES.map(({ id, name }) => {
          const picked = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={`flex items-center gap-2 rounded-card border-2 border-ink px-4 py-2 font-bold transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 ${picked ? 'bg-lemon shadow-sticker-sm' : 'bg-paper hover:-translate-y-0.5'}`}
            >
              <LanguageLogo language={id} className="size-6" />
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
