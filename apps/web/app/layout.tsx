import type { Metadata } from 'next';
import { Baloo_2, JetBrains_Mono, Nunito } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Fonts from docs/DESIGN_SYSTEM.md §3, exposed as CSS variables that
// globals.css maps to font-display, font-sans and font-mono.
const baloo = Baloo_2({
  variable: '--font-baloo',
  subsets: ['latin'],
  weight: ['700', '800'],
});

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
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
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${nunito.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans font-medium">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
