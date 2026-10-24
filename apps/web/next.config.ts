import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright's build (ADR-034) goes to its own folder, so the mock-backed
  // e2e build never replaces the normal `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The service worker (ADR-022) must never be cached by the browser or a
  // CDN, or a fixed sw.js would take a day to reach users. Headers from the
  // Next.js PWA guide.
  async headers() {
    return [
      // Every page: no framing by other sites (clickjacking), no MIME
      // sniffing, and only the origin in the Referer sent elsewhere.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
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
