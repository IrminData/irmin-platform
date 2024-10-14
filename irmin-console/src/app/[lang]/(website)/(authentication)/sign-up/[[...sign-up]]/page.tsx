import { Metadata } from 'next';

import SignUpSection from '@/components/authentication/SignUpSection';

/**
 * Page metadata for SEO on the sign up page
 */
export const metadata: Metadata = {
  title: 'Create new account | IRMIN',
  description: 'Create a new account to access IRMIN.',
  openGraph: {
    type: 'website',
  },
};

/**
 * Sign up page (Website)
 */
export default function SignUpPage() {
  return <SignUpSection />;
}
