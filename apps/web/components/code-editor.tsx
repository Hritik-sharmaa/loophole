'use client';

import { python } from '@codemirror/lang-python';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';

// EditorPanel from docs/DESIGN_SYSTEM.md §6: CodeMirror, light theme,
// JetBrains Mono 14 / 1.6, in a sticker card with an Ink title bar.
// The focus ring is drawn on the wrapper instead.
const extensions = [
  python(),
  EditorView.theme({
    '&': { fontSize: '14px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'var(--font-jetbrains), monospace',
      lineHeight: '1.6',
    },
  }),
  EditorView.contentAttributes.of({ 'aria-label': 'Code editor' }),
];

// Tab indents inside the editor; Esc then Tab moves focus out (CodeMirror's
// built-in escape hatch), so it stays keyboard-reachable both ways.
export function CodeEditor({
  value,
  onChange,
  fileName,
}: {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
}) {
  return (
    <section className="overflow-hidden rounded-card border-2 border-ink bg-paper shadow-sticker focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ink">
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
        extensions={extensions}
        theme="light"
        minHeight="12rem"
        basicSetup={{ foldGutter: false }}
      />
    </section>
  );
}
