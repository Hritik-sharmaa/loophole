import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { PwaRegister } from '@/components/pwa-register';
import { Providers } from './providers';
import './globals.css';

// Fonts from docs/DESIGN_SYSTEM.md §3, exposed as CSS variables that
// globals.css maps to font-display, font-sans and font-mono.
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'Loophole — learn to code, one bug at a time',
  description:
    'Bite-sized coding lessons with real code, instant grading, AI hints, streaks, and live 1v1 debugging duels.',
  applicationName: 'Loophole',
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
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans font-medium">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
