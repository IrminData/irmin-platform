import type { Metadata } from 'next';

import { Inter } from 'next/font/google';

import { LocaleProvider } from '@/context/LocaleContext';
import { ProfileProvider } from '@/context/ProfileContext';

import './globals.scss';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Just like GitHub for Data, made for developers | IRMIN',
  description:
    'Tired of scattered data? Sync, analyse & manage your data with AI in minutes. Use connectors, marketplace & run actions.',
  openGraph: {
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <LocaleProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
