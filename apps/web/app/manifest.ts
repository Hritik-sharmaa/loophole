import type { MetadataRoute } from 'next';

// The web app manifest that makes Loophole installable (ADR-022). Colours
// are the design tokens: Canvas behind the splash screen, Paper for the
// status bar so it matches the app header.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Loophole — learn to code, then out-code your friends',
    short_name: 'Loophole',
    description:
      'Bite-sized coding lessons with real code, instant grading, AI hints, streaks, and live 1v1 debugging duels.',
    id: '/',
    start_url: '/learn',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f2ff',
    theme_color: '#ffffff',
    categories: ['education', 'developer'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Continue learning', url: '/learn' },
      { name: 'Find a duel', url: '/duels' },
    ],
  };
}
