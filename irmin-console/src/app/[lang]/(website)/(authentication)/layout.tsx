import type { Metadata } from 'next';

import AuthLayoutWrapper from '@/components/user/AuthLayoutWrapper';

/**
 * SEO metadata for the authentication routes
 */
export const metadata: Metadata = {
  title: 'Authentication | IRMIN',
};

/**
 * Authentication layout
 */
export default function AuthenticationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthLayoutWrapper>{children}</AuthLayoutWrapper>;
}
