'use client';

import { python } from '@codemirror/lang-python';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';

// EditorPanel from docs/DESIGN_SYSTEM.md §6: CodeMirror, light theme,
// JetBrains Mono 14 / 1.6. The focus ring is drawn on the wrapper instead.
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
    <section className="overflow-hidden rounded-card border-2 border-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
      <h2 className="border-b-2 border-ink px-4 py-2 font-mono text-sm font-bold">
        {fileName}
      </h2>
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
