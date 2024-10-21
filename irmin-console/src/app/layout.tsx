import type { Metadata } from 'next';

import { Big_Shoulders_Display, Inter } from 'next/font/google';

import { ClerkProvider } from '@clerk/nextjs';

import '@/styles/globals.css';
import '@/styles/irmin-global.css';

import { defaultLocale, dictionaries, Locale } from '@/lib/dict';

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
 * Root layout component of the application.
 *
 * Wraps the app with `ClerkProvider` and other global context providers.
 * Initializes the font variables for the app and includes global styles.
 */
export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;

  const { children } = props;

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
