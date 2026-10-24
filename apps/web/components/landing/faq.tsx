import { Plus } from 'lucide-react';
import { SectionHead } from './section-head';

// The questions a first-time visitor has before signing up. Native
// <details>, so every answer opens without JavaScript and works with a
// keyboard and screen readers. Every answer is a fact from docs/.

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'I have never written code. Is this for me?',
    a: 'Yes. Every course starts from zero. Each lesson explains one idea on a card, asks you a quick question, and only then asks you to write code.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. All four courses, duels and the leagues are free. The AI tutor answers up to 20 questions a day.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. You write code in the browser and it runs on our sandbox, so a phone works too. You can add Loophole to your home screen like an app.',
  },
  {
    q: 'What if I get stuck?',
    a: 'Ask the AI tutor for a hint or what an error means. It nudges you towards the fix instead of handing you the answer. Every unit also has a cheat sheet.',
  },
  {
    q: 'How does a duel work?',
    a: 'You and a rival get the same broken program and five minutes. Every fix runs against the tests, the server decides who fixed it first, and your rating moves. No one online? Practise against Meera, Arjun or Harpreet.',
  },
  {
    q: 'Do I get a certificate?',
    a: 'Yes. Finish every lesson and project in a course and you get a certificate with its own public link to share.',
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto grid max-w-6xl scroll-mt-28 gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:pb-28"
    >
      <div className="lg:sticky lg:top-24 lg:self-start">
        <SectionHead label="Questions" title="Before you start.">
          <p className="max-w-[36ch] text-lg text-text-secondary">
            The things people ask us most. Anything else, ask Priya in your
            first lesson.
          </p>
        </SectionHead>
      </div>
      <ul className="flex flex-col gap-3">
        {QUESTIONS.map(({ q, a }) => (
          <li key={q}>
            <details className="group rounded-card border border-border-muted bg-paper transition-colors open:border-violet/40 open:shadow-sticker-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 font-display text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-canvas text-violet transition-[rotate,background-color] duration-200 group-open:rotate-45 group-open:bg-violet group-open:text-paper"
                >
                  <Plus className="size-4" strokeWidth={3} />
                </span>
              </summary>
              <p className="max-w-[60ch] px-5 pb-5 text-text-secondary">{a}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
