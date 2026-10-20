'use client';

import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';

// EditorPanel from docs/DESIGN_SYSTEM.md §6: CodeMirror, light theme,
// JetBrains Mono 14 / 1.6, in a sticker card with an Ink title bar.
// The focus ring is drawn on the wrapper instead.
const shared = [
  EditorView.theme({
    '&': { fontSize: '14px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'var(--font-jetbrains), monospace',
      lineHeight: '1.6',
      // Show code exactly as typed: no ligature turning `<!--` or `->`
      // into an arrow, which confuses beginners.
      fontVariantLigatures: 'none',
    },
  }),
  EditorView.contentAttributes.of({ 'aria-label': 'Code editor' }),
];

// Syntax highlighting by language. Built once: CodeMirror reconfigures
// the editor whenever the extensions array changes identity.
const EXTENSIONS = {
  python: [python(), ...shared],
  javascript: [javascript(), ...shared],
  // HTML mode also highlights the CSS inside <style> (ADR-024).
  html: [html(), ...shared],
};

export type EditorLanguage = keyof typeof EXTENSIONS;

// Tab indents inside the editor; Esc then Tab moves focus out (CodeMirror's
// built-in escape hatch), so it stays keyboard-reachable both ways.
// `compact`: a smaller editor with no sticker shadow, for Learn examples
// inside a card.
export function CodeEditor({
  value,
  onChange,
  fileName,
  compact = false,
  language = 'python',
}: {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
  compact?: boolean;
  language?: EditorLanguage;
}) {
  return (
    <section
      className={`overflow-hidden rounded-card border-2 border-ink bg-paper focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ink ${compact ? '' : 'shadow-sticker'}`}
    >
      <div className="flex items-center gap-3 bg-ink px-4 py-2">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-orange" />
          <span className="size-2.5 rounded-full bg-lemon" />
          <span className="size-2.5 rounded-full bg-pink" />
        </span>
        <h2 className="font-mono text-sm font-bold text-paper">{fileName}</h2>
      </div>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={EXTENSIONS[language]}
        theme="light"
        minHeight={compact ? '4rem' : '12rem'}
        basicSetup={{ foldGutter: false }}
      />
    </section>
  );
}
