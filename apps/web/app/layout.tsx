import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Lexend, Plus_Jakarta_Sans } from 'next/font/google';
import { PwaRegister } from '@/components/pwa-register';
import { Providers } from './providers';
import './globals.css';

// Fonts from docs/DESIGN_SYSTEM.md §3, exposed as CSS variables that
// globals.css maps to font-display, font-sans and font-mono.
const lexend = Lexend({
  variable: '--font-lexend',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const TITLE = 'Loophole — learn to code, then out-code your friends';
const DESCRIPTION =
  'Bite-sized coding lessons in English or Hinglish, with real code, instant grading, AI hints, streaks, and live 1v1 debugging duels. Free.';

export const metadata: Metadata = {
  // The live site (docs/DEPLOY.md), so shared links get a full image URL.
  metadataBase: new URL('https://loophole-psi.vercel.app'),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Loophole',
  // Link previews in WhatsApp, LinkedIn, X and Slack; the image is
  // app/opengraph-image.tsx.
  openGraph: {
    type: 'website',
    siteName: 'Loophole',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  // Installed on iOS: full-screen, named Loophole (ADR-022).
  appleWebApp: { capable: true, title: 'Loophole', statusBarStyle: 'default' },
};

// viewportFit "cover" lets the app draw under a phone's notch and home bar;
// the header and tab bar pad themselves with env(safe-area-inset-*).
export const viewport: Viewport = {
  themeColor: '#ffffff',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans font-medium">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
