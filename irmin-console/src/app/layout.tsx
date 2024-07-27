import type { Metadata } from 'next';

import { Inter } from 'next/font/google';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';

import { LocaleProvider } from '@/context/LocaleContext';
import { ProfileProvider } from '@/context/ProfileContext';

import './globals.scss';

const inter = Inter({ subsets: ['latin'] });

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
 * The providers include the LocaleProvider and ProfileProvider.
 *
 * This component also includes the global styles and fonts for the application.
 *
 * @param children - The children components to render
 * @returns The root layout of the application
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
    <html>
      <body className={inter.className}>
        <LocaleProvider>
          <ProfileProvider locale={lang}>{children}</ProfileProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
