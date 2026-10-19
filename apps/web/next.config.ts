import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The service worker (ADR-022) must never be cached by the browser or a
  // CDN, or a fixed sw.js would take a day to reach users. Headers from the
  // Next.js PWA guide.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
