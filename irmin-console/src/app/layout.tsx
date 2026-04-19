import type { Metadata, Viewport } from 'next';

import localFont from 'next/font/local';

import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { defaultLocale, findLocale, getDictionary } from '@/lib/dict';
import {
  DEFAULT_OPEN_GRAPH,
  DEFAULT_TWITTER,
  SITE_NAME,
  SITE_URL,
} from '@/lib/metadata';

import { IAMProvider } from '@/context/IAMContext';
import { IrminCoreProvider } from '@/context/IrminCoreContext';
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
const loraSerif = localFont({
  src: '../../public/fonts/Lora/Lora-VariableFont_wght.ttf',
  variable: '--lora-serif',
  // Editorial serif — only rendered in <blockquote>. Skip preload.
  preload: false,
});

/**
 * Root SEO metadata for the Irmin Console.
 *
 * - `metadataBase` anchors relative OG/canonical URLs to the production
 *   origin so previews render the same on every deploy.
 * - `title.template` is the console-wide suffix. Descendant layouts with an
 *   entity name (workspace, repo, workflow, …) declare their own template
 *   that includes that name; leaf pages then just set a single-segment
 *   `title` and the nearest template composes the rest.
 * - Shared brand OG / Twitter cards come from `src/app/opengraph-image.tsx`
 *   and `src/app/twitter-image.tsx` via Next.js file conventions — each
 *   in-app route inherits them unless it opts out explicitly.
 * - `description` is pulled from the dictionary (locale-aware via the
 *   `[lang]` param forwarded to root layout by Next.js).
 */
export async function generateMetadata(props: {
  params: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getDictionary(lang ?? defaultLocale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: dict.metadata.app.description,
    applicationName: SITE_NAME,
    openGraph: DEFAULT_OPEN_GRAPH,
    twitter: DEFAULT_TWITTER,
  };
}

/**
 * Viewport configuration. Theme-color lives here, not on `metadata` — Next.js
 * 13.3+ deprecated `metadata.themeColor` and Next 16 silently drops it. The
 * dark hex matches --background in src/styles/theme.css .dark, which is
 * HSL(197 94% 4%) ≈ rgb(1, 14, 20) = #010e14.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#010e14' },
  ],
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
          ${geistMono.variable}
          ${loraSerif.variable}
          scrollbar-hide overscroll-none bg-background text-foreground
          antialiased
        `}
      >
        <a
          href='#console-content'
          className='
            sr-only
            focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md
            focus:bg-background focus:p-4 focus:text-foreground
          '
        >
          Skip to main content
        </a>
        <PostHogProvider>
          <ClerkProvider dynamic>
            <ReactQueryProvider>
              <LocaleProvider>
                <PopupProvider>
                  <IAMProvider>
                    <IrminCoreProvider>
                      <ThemeProvider
                        attribute='class'
                        defaultTheme='system'
                        enableSystem
                        disableTransitionOnChange
                      >
                        {children}
                      </ThemeProvider>
                    </IrminCoreProvider>
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
