import type {
  LearnCard,
  LessonLanguage,
  LessonLearn,
  QuickCheck,
} from '@loophole/shared';

// Hinglish lesson text (ADR-042), stored next to the English: a card's
// `hi` (title, body, and the fix of a bug card), the quick check's `hi`
// (question, explanation, and options only when they are words) and the
// exercise's prompt_hi. Code, inputs and outputs are never translated.
//
// Stored text never goes out as is: every response goes through localize*,
// which picks one language and drops the `hi` blocks.

export type CardHinglish = { title: string; body: string; fix?: string };
export type CheckHinglish = {
  question: string;
  explanation: string;
  options?: string[];
};

export type StoredCard = LearnCard & { hi?: CardHinglish };
export type StoredCheck = QuickCheck & { hi?: CheckHinglish };
export type StoredLearn = { cards: StoredCard[]; check: StoredCheck };

// A card in `language`; English when it has no Hinglish yet.
export function localizeCard(
  card: StoredCard,
  language: LessonLanguage,
): LearnCard {
  const { hi, ...en } = card;
  if (language !== 'hinglish' || !hi) return en;
  return {
    ...en,
    title: hi.title,
    body: hi.body,
    ...(en.bug && hi.fix ? { bug: { ...en.bug, fix: hi.fix } } : {}),
  };
}

export function localizeCheck(
  check: StoredCheck,
  language: LessonLanguage,
): QuickCheck {
  const { hi, ...en } = check;
  if (language !== 'hinglish' || !hi) return en;
  return {
    ...en,
    question: hi.question,
    explanation: hi.explanation,
    options: hi.options ?? en.options,
  };
}

export function localizeLearn(
  learn: StoredLearn | null,
  language: LessonLanguage,
): LessonLearn | null {
  if (!learn) return null;
  return {
    cards: learn.cards.map((c) => localizeCard(c, language)),
    check: localizeCheck(learn.check, language),
  };
}

export function localizePrompt(
  prompt: string,
  promptHi: string | null,
  language: LessonLanguage,
): string {
  return language === 'hinglish' && promptHi ? promptHi : prompt;
}
