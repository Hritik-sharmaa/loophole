import type {
  GitCheck,
  GitScenario,
  LearnCard,
  LessonLanguage,
  LessonLearn,
  QuickCheck,
  WebCheck,
} from '@loophole/shared';

// Hinglish lesson text (ADR-042), stored next to the English: a card's
// `hi` (title, body, and the fix of a bug card), the quick check's `hi`
// (question, explanation, and options only when they are words), the
// exercise's prompt_hi, and each web or git check's `labelHi` (the
// checklist the learner sees). Code, inputs and outputs are never translated.
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

// A web or git exercise's rule with its label in Hinglish.
export type LabelHinglish = { labelHi?: string };
export type StoredWebCheck = WebCheck & LabelHinglish;
export type StoredGitScenario = Omit<GitScenario, 'checks'> & {
  checks: (GitCheck & LabelHinglish)[];
};

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

// Checks with their labels in `language`, ready for the checklist and for
// grading (whose results carry the label). The `labelHi` is dropped.
export function localizeLabels<T extends { label: string }>(
  checks: readonly (T & LabelHinglish)[],
  language: LessonLanguage,
): T[] {
  return checks.map((check) => {
    const { labelHi, ...en } = check;
    return (
      language === 'hinglish' && labelHi ? { ...en, label: labelHi } : en
    ) as T;
  });
}
