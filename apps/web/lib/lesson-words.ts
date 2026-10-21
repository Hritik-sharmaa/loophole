'use client';

import type { LessonLanguage } from '@loophole/shared';
import { useMe } from './queries/use-me';

// What the guides say around a lesson's own text (ADR-042): feedback on
// the quick check and bug cards, and the finish line. The lesson text
// itself comes from the API already in the learner's language. Buttons
// stay in English, as they usually do in Hinglish apps.
const WORDS = {
  en: {
    right: "That's it!",
    wrong: 'Not quite. Look at the code again and try another answer.',
    pick: 'Pick an answer.',
    found: 'You found it!',
    bugOnLine: (line: number) => `The bug is on line ${line}.`,
    notThat: 'Not that one. Look again.',
    showMe: 'Show me',
    tapBug: 'Tap the line with the bug.',
    // Around the lesson title: "You finished <title>."
    finished: ['You finished ', '.'],
  },
  hinglish: {
    right: 'Bilkul sahi!',
    wrong: 'Thoda sa chook gaye. Code dobara dekho aur doosra answer try karo.',
    pick: 'Ek answer chuno.',
    found: 'Bug mil gaya!',
    bugOnLine: (line: number) => `Bug line ${line} par hai.`,
    notThat: 'Yeh wali nahi. Dobara dekho.',
    showMe: 'Dikhao',
    tapBug: 'Bug wali line par tap karo.',
    finished: ['Aapne ', ' poora kar liya.'],
  },
} satisfies Record<LessonLanguage, unknown>;

export type LessonWords = (typeof WORDS)['en'];

// The words for the signed-in learner's lesson language; English until
// their profile has loaded.
export function useLessonWords(): LessonWords {
  const me = useMe(true);
  return WORDS[me.data?.lessonLanguage ?? 'en'];
}
