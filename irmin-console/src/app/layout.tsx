import type { Metadata } from 'next';

import { Big_Shoulders, Inter, PT_Serif, Space_Mono } from 'next/font/google';

import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { defaultLocale, findLocale } from '@/lib/dict';

import { IAMProvider } from '@/context/IAMContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { PopupProvider } from '@/context/PopupContext';
import { PostHogProvider } from '@/context/PostHogProvider';
import ReactQueryProvider from '@/context/ReactQueryProvider';
import { ThemeProvider } from '@/context/ThemeProvider';

const interSans = Inter({ subsets: ['latin'], variable: '--font-inter-sans' });
const bigShouldersDisplay = Big_Shoulders({
  subsets: ['latin'],
  variable: '--font-big-shoulders-display',
});
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});
const ptSerif = PT_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-serif',
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
          ${interSans.variable}
          ${bigShouldersDisplay.variable}
          ${spaceMono.variable}
          ${ptSerif.variable}
          scrollbar-hide overscroll-none bg-background text-foreground
          antialiased
        `}
      >
        <PostHogProvider>
          <ClerkProvider dynamic>
            <ReactQueryProvider>
              <LocaleProvider>
                <PopupProvider>
                  <IAMProvider>
                    <ThemeProvider
                      attribute='class'
                      defaultTheme='system'
                      enableSystem
                      disableTransitionOnChange
                    >
                      {children}
                    </ThemeProvider>
                  </IAMProvider>
                </PopupProvider>
              </LocaleProvider>
            </ReactQueryProvider>
          </ClerkProvider>
        </PostHogProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
