import type { Metadata } from 'next';

import localFont from 'next/font/local';

import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { defaultLocale, findLocale } from '@/lib/dict';

import { IAMProvider } from '@/context/IAMContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { PopupProvider } from '@/context/PopupContext';
import { PostHogProvider } from '@/context/PostHogProvider';
import ReactQueryProvider from '@/context/ReactQueryProvider';
import { ThemeProvider } from '@/context/ThemeProvider';

import './globals.css';

const geistSans = localFont({
  src: '../../public/fonts/Geist/Geist-VariableFont_wght.ttf',
  variable: '--geist-sans',
});
const geistMono = localFont({
  src: '../../public/fonts/Geist_Mono/GeistMono-VariableFont_wght.ttf',
  variable: '--geist-mono',
});
const bigShouldersDisplay = localFont({
  src: '../../public/fonts/Big_Shoulders/BigShoulders-VariableFont_opsz,wght.ttf',
  variable: '--big-shoulders-display',
});
const loraSerif = localFont({
  src: '../../public/fonts/Lora/Lora-VariableFont_wght.ttf',
  variable: '--lora-serif',
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
 * Wraps the app with varopis global context providers, like auth, locale, analytics, and theme providers.
 * Initializes the font variables for the app and includes global styles.
 */
export default async function RootLayout(props: {
  children: React.ReactNode;
  params: { lang?: string };
}) {
  const { children, params } = props;

  // Extract locale from params, fallback to defaultLocale
  const locale = params.lang ? findLocale(params.lang) : defaultLocale;

  return (
    <html suppressHydrationWarning lang={locale}>
      <head />
      <body
        className={`
          ${geistSans.variable}
          ${bigShouldersDisplay.variable}
          ${geistMono.variable}
          ${loraSerif.variable}
          scrollbar-hide overscroll-none bg-background text-foreground
          antialiased
        `}
      >
        <PostHogProvider>
          <ClerkProvider dynamic>
            <ReactQueryProvider>
              <LocaleProvider>
                <IAMProvider>
                  <PopupProvider>
                    <ThemeProvider
                      attribute='class'
                      defaultTheme='system'
                      enableSystem
                      disableTransitionOnChange
                    >
                      {children}
                    </ThemeProvider>
                  </PopupProvider>
                </IAMProvider>
              </LocaleProvider>
            </ReactQueryProvider>
          </ClerkProvider>
        </PostHogProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
