// Renders text where `backticks` mark code, the only formatting lesson
// prompts use (docs/CONTENT_GUIDE.md). No markdown library needed.
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="rounded-badge border border-border-muted bg-surface px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}
