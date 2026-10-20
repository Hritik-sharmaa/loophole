import type { EditorLanguage } from '@/components/code-editor';

// Per course language: the editor's highlighting and the file names shown
// on its title bar. Unknown languages fall back to plain Python-style.
const LANGUAGES: Record<
  string,
  { editor: EditorLanguage; file: string; example: string }
> = {
  python: { editor: 'python', file: 'main.py', example: 'example.py' },
  javascript: { editor: 'javascript', file: 'main.js', example: 'example.js' },
  html: { editor: 'html', file: 'index.html', example: 'example.html' },
  git: { editor: 'plain', file: 'terminal', example: 'commands' },
};

export function languageInfo(language: string) {
  return LANGUAGES[language] ?? LANGUAGES.python;
}
