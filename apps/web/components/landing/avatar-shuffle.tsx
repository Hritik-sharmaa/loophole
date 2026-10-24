'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Avatar, AvatarArt, bgHex, parseAvatar } from '@/components/avatar';
import { gsap, MOTION_OK, useGSAP } from './gsap';
import { SectionHead } from './section-head';

// The avatar maker, teased (ADR-046, ADR-048): one avatar changes a part
// at a time with a squash and a bounce, and the part's name lights up.
// Every look is a real avatar code the maker can save.

const LOOKS: { code: string; part: string }[] = [
  {
    code: 's3.dots.fluffy.black.hoodie.violet.none.none.none.lilac',
    part: 'Hair',
  },
  {
    code: 's3.dots.fluffy.black.hoodie.violet.none.cat.none.lilac',
    part: 'Item',
  },
  {
    code: 's3.dots.fluffy.black.hoodie.violet.round.cat.none.lilac',
    part: 'Glasses',
  },
  {
    code: 's3.dots.braid.black.hoodie.violet.round.cat.none.lilac',
    part: 'Hair',
  },
  { code: 's3.dots.braid.black.kurta.sun.round.cat.none.peach', part: 'Body' },
  { code: 's3.grin.braid.black.kurta.sun.round.cat.none.peach', part: 'Face' },
  {
    code: 's3.grin.braid.black.kurta.sun.round.cat.jhumkas.peach',
    part: 'Extras',
  },
  {
    code: 's4.smile.patka.blue.hoodie.ink.none.headphones.beard.sky',
    part: 'Hair',
  },
  {
    code: 's5.wink.bun.black.sweater.coral.shades.flower.bindi.mint',
    part: 'Glasses',
  },
];

const PARTS = ['Hair', 'Face', 'Body', 'Glasses', 'Item', 'Extras'];

// The crowd around the big avatar, and where each one floats.
const CROWD = [
  {
    code: 's5.smile.patka.blue.tee.sun.none.none.beard.sun',
    spot: '-top-6 -left-8',
    delay: '0s',
  },
  {
    code: 's2.grin.bob.darkbrown.sweater.coral.round.none.none.mint',
    spot: '-top-8 right-6',
    delay: '-0.8s',
  },
  {
    code: 's6.smile.bun.black.kurta.teal.none.flower.bindi.peach',
    spot: 'top-1/3 -right-12',
    delay: '-1.6s',
  },
  {
    code: 's1.wink.short.brown.collar.sky.square.none.freckles.sky',
    spot: '-bottom-8 right-2',
    delay: '-2.2s',
  },
  {
    code: 's4.dots.long.black.hoodie.ink.shades.headphones.none.lilac',
    spot: '-bottom-6 -left-10',
    delay: '-0.4s',
  },
  {
    code: 's3.grin.buzz.black.tee.violet.none.crown.moustache.sun',
    spot: 'top-1/2 -left-14',
    delay: '-1.2s',
  },
];

export function AvatarShuffle() {
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({
          repeat: -1,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 70%',
            end: 'bottom 20%',
            toggleActions: 'play pause resume pause',
          },
        });
        LOOKS.forEach((_, i) => {
          const next = (i + 1) % LOOKS.length;
          tl.to({}, { duration: 1 })
            .to('[data-face]', {
              scaleX: 1.08,
              scaleY: 0.86,
              duration: 0.12,
              ease: 'power2.in',
              transformOrigin: '50% 100%',
            })
            .call(() => setIndex(next))
            .to('[data-face]', {
              scaleX: 1,
              scaleY: 1,
              duration: 0.7,
              ease: 'elastic.out(1, 0.35)',
            });
        });
      });
    },
    { scope: root },
  );

  const look = LOOKS[index];
  const parts = parseAvatar(look.code);

  return (
    <section ref={root} className="bg-[#fff6dc]">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:pt-16 lg:pb-28">
        <div className="flex flex-col items-start gap-6">
          <SectionHead
            label="Your avatar"
            title="A face that's actually you."
          />
          <p className="max-w-[42ch] text-lg text-text-secondary">
            Braid or patka, kurta or hoodie, glasses, jhumkas, even a cat on
            your head. Your avatar shows up in your league and on every duel.
          </p>
          <ul
            className="flex flex-wrap gap-2"
            aria-label="Parts you can change"
          >
            {PARTS.map((p) => (
              <li
                key={p}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-300 ${p === look.part ? 'bg-ink text-paper' : 'bg-paper text-text-secondary'}`}
              >
                {p}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="rounded-badge text-sm font-bold underline decoration-violet decoration-2 underline-offset-4 hover:text-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
          >
            Make yours after your first lesson
          </Link>
        </div>
        <div aria-hidden className="relative mx-auto my-8 lg:my-0">
          <div className="absolute inset-6 -z-10 translate-x-5 translate-y-5 rounded-[3rem] bg-sun/40" />
          {/* Other learners' avatars float around yours: every one of
              them is a real code the maker can save. */}
          {CROWD.map((c) => (
            <span
              key={c.code}
              className={`absolute z-10 animate-bob rounded-full border-4 border-paper shadow-sticker-sm ${c.spot}`}
              style={{ animationDelay: c.delay }}
            >
              <Avatar code={c.code} className="size-12 border-0 sm:size-14" />
            </span>
          ))}

          <div
            className="grid size-72 place-items-center overflow-hidden rounded-[3rem] border-4 border-paper shadow-sticker transition-colors duration-500 sm:size-80"
            style={{ backgroundColor: bgHex(parts.bg) }}
          >
            <svg data-face viewBox="0 0 200 200" className="size-full">
              <AvatarArt parts={parts} />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
