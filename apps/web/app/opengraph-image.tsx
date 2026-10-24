import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// The picture a shared Loophole link shows in WhatsApp, LinkedIn, X and
// Slack: the loop, the tagline and a tiny lesson that passes. Built once
// at build time. Fonts are the site's own (assets/fonts, OFL).

export const alt =
  'Loophole: learn to code, then out-code your friends. Bite-sized lessons in English or Hinglish and live 1v1 debugging duels.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#1e1638';
const VIOLET = '#6a4df4';
const SUN = '#ffc21a';
const MUTED = '#6a6382';
const LINE = '#e2daf6';

const font = (file: string) =>
  readFile(join(process.cwd(), 'assets/fonts', file));

export default async function OpengraphImage() {
  const [semibold, regular, mono] = await Promise.all([
    font('Lexend-SemiBold.ttf'),
    font('Lexend-Regular.ttf'),
    font('JetBrainsMono-Medium.ttf'),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '64px 72px',
        backgroundColor: '#f6f2ff',
        fontFamily: 'Lexend',
        color: INK,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Loop />
          <span style={{ fontSize: 40, fontWeight: 600 }}>loophole</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 44,
            fontSize: 72,
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
          }}
        >
          <span>Learn to code.</span>
          <span style={{ display: 'flex' }}>
            Then&nbsp;
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                color: VIOLET,
              }}
            >
              out-code
              <span
                style={{
                  height: 12,
                  marginTop: -6,
                  borderRadius: 12,
                  backgroundColor: SUN,
                }}
              />
            </span>
          </span>
          <span>your friends.</span>
        </div>

        <span
          style={{
            marginTop: 32,
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.4,
            color: MUTED,
          }}
        >
          Bite-sized lessons in English or Hinglish, and live 1v1 debugging
          duels. Free.
        </span>
      </div>

      {/* A tiny lesson that passes, like the landing page's last card. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 380,
          padding: 28,
          borderRadius: 36,
          backgroundColor: '#ffffff',
          border: `2px solid ${LINE}`,
          boxShadow: '0 30px 60px -30px rgba(60,30,120,0.45)',
          transform: 'rotate(3deg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['#ff7a93', SUN, '#7fddb8'].map((c) => (
            <span
              key={c}
              style={{
                width: 14,
                height: 14,
                borderRadius: 14,
                backgroundColor: c,
              }}
            />
          ))}
          <span
            style={{
              marginLeft: 10,
              fontFamily: 'JetBrains Mono',
              fontSize: 18,
              color: MUTED,
            }}
          >
            hello.py
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 20,
            padding: '18px 20px',
            borderRadius: 22,
            backgroundColor: INK,
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
            color: '#f6f2ff',
          }}
        >
          <span style={{ color: SUN }}>print</span>(
          <span style={{ color: '#7fddb8' }}>&quot;Hello, world&quot;</span>)
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 18,
            backgroundColor: '#ede7ff',
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 30,
              backgroundColor: VIOLET,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M3 8.5 L6.5 12 L13 4.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          All tests passed
        </div>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            marginTop: 16,
            padding: '10px 22px',
            borderRadius: 999,
            backgroundColor: SUN,
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          +15 XP
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Lexend', data: semibold, weight: 600, style: 'normal' },
        { name: 'Lexend', data: regular, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
      ],
    },
  );
}

// The loop logo on its Sunflower tile (components/logo.tsx, LoopMark).
function Loop() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="17" fill={SUN} />
      <path
        d="M16 47 C27 41 43 29 43 19 C43 12 37 9.5 33.5 12 C29.5 15 29 23 31 31 C32.5 38 35 44 39.5 47"
        fill="none"
        stroke={INK}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="47.5" cy="46.5" r="4.6" fill={INK} />
    </svg>
  );
}
