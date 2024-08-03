import { Metadata } from 'next';

import SignIn from '@/components/auth/signIn';

/**
 * Page metadata for SEO on the sign in page
 */
export const metadata: Metadata = {
  title: 'Sign in | IRMIN',
  description: 'Sign in to access IRMIN.',
  openGraph: {
    type: 'website',
  },
};

/**
 * Sign in page (Website)
 */
export default function SignInPage() {
  return <SignIn />;
}
