'use client';

import { Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

// Never changes after load, so there is nothing to subscribe to.
const noSubscribe = () => () => {};

// Reads a guide's line aloud with the browser's own speech (ADR-032): an
// Indian English voice when the device has one. Nothing leaves the
// browser. Hidden where speech isn't supported, and on the server.
export function ReadAloud({
  text,
  pitch = 1,
}: {
  text: string;
  // Each guide sounds a little different (GUIDES[...].pitch).
  pitch?: number;
}) {
  const supported = useSyncExternalStore(
    noSubscribe,
    () => 'speechSynthesis' in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop talking when the card changes or the page goes away.
  useEffect(
    () => () => {
      if (current.current) {
        current.current = null;
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  if (!supported) return null;

  function toggle() {
    const speech = window.speechSynthesis;
    speech.cancel();
    if (speaking) {
      current.current = null;
      setSpeaking(false);
      return;
    }
    // Backticks mark code in card text; they aren't meant to be heard.
    const line = new SpeechSynthesisUtterance(text.replaceAll('`', ''));
    const voices = speech.getVoices();
    line.voice =
      voices.find((v) => v.lang.replace('_', '-') === 'en-IN') ??
      voices.find((v) => v.lang.startsWith('en')) ??
      null;
    line.lang = line.voice?.lang ?? 'en-IN';
    line.rate = 0.95;
    line.pitch = pitch;
    const done = () => {
      if (current.current === line) {
        current.current = null;
        setSpeaking(false);
      }
    };
    line.onend = done;
    line.onerror = done;
    current.current = line;
    setSpeaking(true);
    speech.speak(line);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? 'Stop reading' : 'Read aloud'}
      aria-pressed={speaking}
      title={speaking ? 'Stop reading' : 'Read aloud'}
      className={`flex size-9 shrink-0 items-center justify-center rounded-node border border-border-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet ${speaking ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-surface'}`}
    >
      {speaking ? (
        <Square className="size-3.5" fill="currentColor" aria-hidden />
      ) : (
        <Volume2 className="size-4" strokeWidth={2.5} aria-hidden />
      )}
    </button>
  );
}
