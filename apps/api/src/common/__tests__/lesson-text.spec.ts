import {
  localizeCard,
  localizeCheck,
  localizeLearn,
  localizePrompt,
  type StoredLearn,
} from '../lesson-text.js';

const learn: StoredLearn = {
  cards: [
    {
      title: 'Text goes in quotes',
      body: 'Wrap it in quotes.',
      code: 'print("Hi")\n',
      output: 'Hi',
      hi: { title: 'Text quotes mein jaata hai', body: 'Quotes mein rakho.' },
    },
    {
      title: 'Spot the bug',
      body: 'Tap it.',
      code: 'print("Hi)\n',
      bug: { line: 1, fix: 'It needs a closing quote.' },
      hi: {
        title: 'Bug dhoondo',
        body: 'Tap karo.',
        fix: 'Closing quote chahiye.',
      },
    },
  ],
  check: {
    question: 'What does this print?',
    code: 'print(2 + 2)\n',
    options: ['4', 'An error'],
    answer: 0,
    explanation: 'It adds.',
    hi: {
      question: 'Yeh kya print karega?',
      explanation: 'Yeh jodta hai.',
      options: ['4', 'Error aayega'],
    },
  },
};

describe('localizeLearn', () => {
  it('English drops every hi block and changes nothing else', () => {
    const en = localizeLearn(learn, 'en');
    expect(JSON.stringify(en)).not.toContain('"hi"');
    expect(en?.cards[0]).toEqual({
      title: 'Text goes in quotes',
      body: 'Wrap it in quotes.',
      code: 'print("Hi")\n',
      output: 'Hi',
    });
    expect(en?.check.options).toEqual(['4', 'An error']);
  });

  it('Hinglish swaps the words and keeps code, outputs and answers', () => {
    const hi = localizeLearn(learn, 'hinglish');
    expect(JSON.stringify(hi)).not.toContain('"hi"');
    expect(hi?.cards[0]).toEqual({
      title: 'Text quotes mein jaata hai',
      body: 'Quotes mein rakho.',
      code: 'print("Hi")\n',
      output: 'Hi',
    });
    expect(hi?.cards[1].bug).toEqual({
      line: 1,
      fix: 'Closing quote chahiye.',
    });
    expect(hi?.check).toEqual({
      question: 'Yeh kya print karega?',
      code: 'print(2 + 2)\n',
      options: ['4', 'Error aayega'],
      answer: 0,
      explanation: 'Yeh jodta hai.',
    });
  });

  it('falls back to English where there is no Hinglish yet', () => {
    const plain = { title: 'T', body: 'B' };
    expect(localizeCard(plain, 'hinglish')).toEqual(plain);
    const check = { ...learn.check, hi: undefined };
    expect(localizeCheck(check, 'hinglish')).toEqual(check);
    expect(localizeLearn(null, 'hinglish')).toBeNull();
  });

  it('keeps English options when the Hinglish check has none', () => {
    const check = {
      ...learn.check,
      hi: { question: 'Q', explanation: 'E' },
    };
    expect(localizeCheck(check, 'hinglish').options).toEqual(['4', 'An error']);
  });
});

describe('localizePrompt', () => {
  it('uses the Hinglish prompt only when asked and present', () => {
    expect(localizePrompt('Print it', 'Print karo', 'hinglish')).toBe(
      'Print karo',
    );
    expect(localizePrompt('Print it', 'Print karo', 'en')).toBe('Print it');
    expect(localizePrompt('Print it', null, 'hinglish')).toBe('Print it');
  });
});
