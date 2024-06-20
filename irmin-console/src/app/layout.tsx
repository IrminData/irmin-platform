import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { ProfileProvider } from '@/context/ProfileContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Irmin',
  description: 'A better home for your data',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
