'use client';

import type { AvatarCode, AvatarParts } from '@loophole/shared';
import { Check, Palette, Shuffle } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import {
  AvatarArt,
  BGS,
  DETAILS,
  FACES,
  GLASSES,
  HAIR_COLORS,
  HAIRS,
  ITEMS,
  SKINS,
  TOP_COLORS,
  TOPS,
  bgHex,
  encodeAvatar,
  parseAvatar,
  randomAvatar,
} from '@/components/avatar';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { useUpdateMe } from '@/lib/queries/use-me';

// The avatar maker (ADR-046): a big preview, a tab per part, a grid of
// options drawn on the learner's own avatar, and colour swatches for the
// parts that have colours. Nothing is saved until Save.

type Choice = { id: string; label: string };
type Swatch = Choice & { hex: string };

type Tab = {
  name: string;
  part: keyof AvatarParts;
  options: Choice[];
  // The colour row above the grid, if this part has one.
  colors?: { part: keyof AvatarParts; label: string; swatches: Swatch[] };
  // Tiles zoom in on the head, or show the shoulders for tops.
  crop: string;
};

const HEAD_CROP = '28 4 144 144';

const TABS: Tab[] = [
  {
    name: 'Hair',
    part: 'hair',
    options: HAIRS,
    colors: { part: 'hairColor', label: 'Hair colour', swatches: HAIR_COLORS },
    crop: HEAD_CROP,
  },
  {
    name: 'Face',
    part: 'face',
    options: FACES,
    colors: { part: 'skin', label: 'Skin', swatches: SKINS },
    crop: '50 58 100 80',
  },
  {
    name: 'Body',
    part: 'top',
    options: TOPS,
    colors: { part: 'topColor', label: 'Colour', swatches: TOP_COLORS },
    crop: '12 96 176 108',
  },
  { name: 'Glasses', part: 'glasses', options: GLASSES, crop: '50 58 100 80' },
  { name: 'Item', part: 'item', options: ITEMS, crop: '30 0 140 140' },
  { name: 'Extras', part: 'detail', options: DETAILS, crop: '44 52 112 100' },
];

export function AvatarMaker({ saved }: { saved: AvatarCode }) {
  const [parts, setParts] = useState<AvatarParts>(() => parseAvatar(saved));
  const [tabIndex, setTabIndex] = useState(0);
  const [showBg, setShowBg] = useState(false);
  const update = useUpdateMe();
  const ids = useId();

  const tab = TABS[tabIndex];
  const code = encodeAvatar(parts);
  const changed = code !== saved;

  // Ids come from the part's own option list, so the cast is safe.
  function set(part: keyof AvatarParts, id: string) {
    update.reset();
    setParts((p) => ({ ...p, [part]: id }) as AvatarParts);
  }

  // A patka uses the hair colour as its cloth.
  const colorLabel =
    tab.part === 'hair' && parts.hair === 'patka'
      ? 'Patka colour'
      : tab.colors?.label;

  return (
    <div className="grid w-full gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-start">
      {/* Preview */}
      <div className="flex flex-col gap-4 md:sticky md:top-24">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-[2rem] border-2 border-ink shadow-sticker"
          style={{ backgroundColor: bgHex(parts.bg) }}
        >
          <svg
            viewBox="0 0 200 200"
            className="size-full"
            role="img"
            aria-label="Your avatar"
          >
            <AvatarArt parts={parts} />
          </svg>
          <button
            type="button"
            onClick={() => {
              update.reset();
              setParts(randomAvatar());
            }}
            className="absolute top-3 right-3 grid size-11 place-items-center rounded-full border-2 border-ink bg-paper shadow-sticker-sm transition-transform active:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Shuffle every part"
            title="Shuffle"
          >
            <Shuffle className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setShowBg((s) => !s)}
            aria-expanded={showBg}
            aria-controls={`${ids}-bg`}
            className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full border-2 border-ink bg-paper shadow-sticker-sm transition-transform active:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Background colour"
            title="Background"
          >
            <Palette className="size-5" aria-hidden />
          </button>
        </div>
        {showBg && (
          <div
            id={`${ids}-bg`}
            className="flex flex-wrap items-center gap-2 rounded-card border-2 border-ink bg-paper px-3 py-2"
          >
            <Swatches
              label="Background"
              swatches={BGS}
              value={parts.bg}
              onPick={(id) => set('bg', id)}
              small
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => update.mutate({ avatar: code })}
            disabled={!changed || update.isPending}
            className={`${primaryButton} flex-1`}
          >
            {update.isPending ? 'Saving…' : 'Save avatar'}
          </button>
          <Link href="/profile" className={secondaryButton}>
            Back to profile
          </Link>
        </div>
        <p aria-live="polite" className="min-h-5 text-sm font-semibold">
          {update.isSuccess &&
            !changed &&
            '✓ Saved. Rivals will see it next time they look.'}
          {update.isError && `✕ ${update.error.message}`}
        </p>
      </div>

      {/* Parts */}
      <div className="flex min-w-0 flex-col gap-4">
        <div
          role="tablist"
          aria-label="Avatar parts"
          className="flex justify-between gap-1 overflow-x-auto border-b-2 border-border-muted sm:justify-start"
        >
          {TABS.map((t, i) => {
            const active = i === tabIndex;
            return (
              <button
                key={t.name}
                type="button"
                role="tab"
                id={`${ids}-tab-${i}`}
                aria-selected={active}
                aria-controls={`${ids}-panel`}
                onClick={() => setTabIndex(i)}
                className={`-mb-0.5 shrink-0 border-b-[3px] px-1.5 pt-1 pb-2 font-display text-[15px] font-bold sm:px-3 sm:text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${active ? 'border-ink text-ink' : 'border-transparent text-text-tertiary hover:text-ink'}`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${ids}-panel`}
          aria-labelledby={`${ids}-tab-${tabIndex}`}
          className="flex flex-col gap-4"
        >
          {tab.colors && (
            <div className="flex flex-wrap items-center gap-2">
              <Swatches
                label={colorLabel ?? tab.colors.label}
                swatches={tab.colors.swatches}
                value={parts[tab.colors.part]}
                onPick={(id) => set(tab.colors!.part, id)}
              />
            </div>
          )}

          <ul
            className="grid grid-cols-3 gap-3 sm:grid-cols-4"
            aria-label={tab.name}
          >
            {tab.options.map((option) => {
              const chosen = parts[tab.part] === option.id;
              const preview = {
                ...parts,
                [tab.part]: option.id,
              } as AvatarParts;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => set(tab.part, option.id)}
                    aria-pressed={chosen}
                    aria-label={option.label}
                    title={option.label}
                    className={`flex aspect-square w-full items-center justify-center rounded-card border-2 bg-paper p-1 transition-[translate,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${chosen ? 'border-ink bg-surface' : 'border-border-muted hover:-translate-y-0.5 hover:border-ink'}`}
                  >
                    <svg viewBox={tab.crop} className="size-full" aria-hidden>
                      <AvatarArt parts={preview} />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Swatches({
  label,
  swatches,
  value,
  onPick,
  small = false,
}: {
  label: string;
  swatches: Swatch[];
  value: string;
  onPick: (id: string) => void;
  small?: boolean;
}) {
  return (
    <>
      <span className="mr-1 text-sm font-semibold text-text-secondary">
        {label}
      </span>
      {swatches.map((s) => {
        const chosen = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            aria-pressed={chosen}
            aria-label={`${label}: ${s.label}`}
            title={s.label}
            className={`grid shrink-0 place-items-center rounded-full border-2 border-ink transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${small ? 'size-7' : 'size-9'} ${chosen ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'hover:scale-110'}`}
            style={{ backgroundColor: s.hex }}
          >
            {chosen && (
              <Check
                className={`size-4 ${isLight(s.hex) ? 'text-ink' : 'text-paper'}`}
                strokeWidth={3}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </>
  );
}

// Ink ticks on pale swatches, white ticks on dark ones.
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}
