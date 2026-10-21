import { BadGatewayException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import {
  GeminiClient,
  cardPrompt,
  explainPrompt,
  type ExplainInput,
} from '../gemini.client.js';

// The SDK is replaced; no test ever calls Gemini (docs/AI_TUTOR.md §2).
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@google/genai')>()),
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const config = {
  get: (key: string) =>
    key === 'GEMINI_MODEL' ? 'gemini-flash-latest' : 'test-key',
} as unknown as ConfigService<EnvironmentVariables, true>;

const reply = (json: unknown) => ({
  text: typeof json === 'string' ? json : JSON.stringify(json),
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
});

const explainInput: ExplainInput = {
  language: 'python',
  exercisePrompt: 'Print the sum.',
  code: 'a = 1\nprint(a +)',
  failingTest: { input: '2\n3\n', expectedOutput: '5', actualOutput: '' },
  stderr: 'SyntaxError: invalid syntax',
};

describe('GeminiClient', () => {
  // Braces matter: a function returned from beforeEach runs as cleanup.
  beforeEach(() => {
    generateContent.mockReset();
  });

  it('sends the documented settings and parses the JSON reply', async () => {
    generateContent.mockResolvedValue(
      reply({ explanation: 'Line 2 is missing a value.', line: 2 }),
    );

    const out = await new GeminiClient(config).explainError(explainInput);

    expect(out).toEqual({ explanation: 'Line 2 is missing a value.', line: 2 });
    const [request] = generateContent.mock.calls[0] as [
      { model: string; contents: string; config: Record<string, unknown> },
    ];
    expect(request.model).toBe('gemini-flash-latest');
    expect(request.config).toMatchObject({
      responseMimeType: 'application/json',
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: 'LOW' },
      httpOptions: { timeout: 10_000 },
    });
    expect(request.config.systemInstruction).toContain('at most 120 words');
  });

  it.each([
    ['not JSON', 'Sure! Here is the answer'],
    ['the wrong shape', { answer: 'x' }],
  ])('throws 502 AI_UNAVAILABLE for %s', async (_case, body) => {
    generateContent.mockResolvedValue(reply(body));
    await expect(
      new GeminiClient(config).giveHint({
        language: 'python',
        exercisePrompt: 'x',
        code: '',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws 502 when the SDK call fails (timeout, quota, network)', async () => {
    generateContent.mockRejectedValue(new Error('deadline exceeded'));
    const err: unknown = await new GeminiClient(config)
      .explainError(explainInput)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(BadGatewayException);
    expect((err as BadGatewayException).getResponse()).toMatchObject({
      code: 'AI_UNAVAILABLE',
    });
  });

  it('drops a line number that is not an integer', async () => {
    generateContent.mockResolvedValue(
      reply({ explanation: 'Check line two.', line: 'two' }),
    );
    const out = await new GeminiClient(config).explainError(explainInput);
    expect(out.line).toBeNull();
  });
});

describe('explainPrompt', () => {
  it('numbers the code lines and includes the failing example', () => {
    const prompt = explainPrompt(explainInput);
    expect(prompt).toContain('1: a = 1\n2: print(a +)');
    expect(prompt).toContain('input="2\\n3\\n" expected="5" got=""');
    expect(prompt).toContain('Error output: SyntaxError: invalid syntax');
  });

  it('says only that other inputs fail when every example passed', () => {
    const prompt = explainPrompt({ ...explainInput, failingTest: null });
    expect(prompt).toContain('the shown example passes');
    expect(prompt).not.toContain('input=');
  });
});

describe('cardPrompt (ADR-036)', () => {
  const card = {
    language: 'python',
    lessonTitle: 'Hello, world',
    title: 'Text goes in quotes',
    body: 'Wrap text in quotes.',
  };

  it('sends the card and its example, and asks for simpler words', () => {
    const prompt = cardPrompt({ ...card, code: 'print("hi")' });
    expect(prompt).toContain('Card title: Text goes in quotes');
    expect(prompt).toContain('Card example:\nprint("hi")');
    expect(prompt).toContain('different, simpler words');
  });

  it('leaves the example out for a text-only card', () => {
    expect(cardPrompt(card)).not.toContain('Card example');
  });
});
