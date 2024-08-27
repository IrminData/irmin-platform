import type { Metadata } from 'next';

import { Big_Shoulders_Display, Inter } from 'next/font/google';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';
import 'react-datasheet-grid/dist/style.css';

import { DarkModeProvider } from '@/context/DarkModeContext';
import { IAMProvider } from '@/context/IAMContext';
import { LocaleProvider } from '@/context/LocaleContext';

import './globals.scss';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const bigShouldersDisplay = Big_Shoulders_Display({
  subsets: ['latin'],
  variable: '--font-big-shoulders-display',
});

/**
 * SEO metadata for the root layout of the application
 */
export const metadata: Metadata = {
  title: 'Just like GitHub for Data, made for developers | IRMIN',
  description:
    'Tired of scattered data? Sync, analyse & manage your data with AI in minutes. Use connectors, marketplace & run actions.',
  openGraph: {
    type: 'website',
  },
};

/**
 * Root layout component of the application
 *
 * @remarks
 *
 * This component is used to wrap the entire application with the necessary providers.
 * The providers include the LocaleProvider and IAMProvider.
 *
 * This component also includes the global styles and fonts for the application.
 *
 * @param children - The children components to render
 */
export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { lang: Locale };
}>) {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;

  return (
    <html suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bigShouldersDisplay.variable} scrollbar-hide`}
      >
        <DarkModeProvider>
          <LocaleProvider>
            <IAMProvider locale={lang}>{children}</IAMProvider>
          </LocaleProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
