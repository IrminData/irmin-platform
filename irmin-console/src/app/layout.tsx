import type { Metadata } from 'next';

import { Big_Shoulders_Display, Inter } from 'next/font/google';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';
import '@/styles/globals.scss';
import { ClerkProvider } from '@clerk/nextjs';
import 'react-datasheet-grid/dist/style.css';

import { IAMProvider } from '@/context/IAMContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { ThemeProvider } from '@/context/ThemeProvider';

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
    <ClerkProvider>
      <html suppressHydrationWarning>
        <head />
        <body
          className={`${inter.variable} ${bigShouldersDisplay.variable} scrollbar-hide`}
        >
          <LocaleProvider>
            <IAMProvider locale={lang}>
              <ThemeProvider
                attribute='class'
                defaultTheme='system'
                enableSystem
                disableTransitionOnChange
              >
                {children}
              </ThemeProvider>
            </IAMProvider>
          </LocaleProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
