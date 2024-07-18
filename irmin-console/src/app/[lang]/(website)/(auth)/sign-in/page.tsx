import { Metadata } from 'next';

import SignInSection from '@/components/auth/signInSection';

export const metadata: Metadata = {
  title: 'Sign in | IRMIN',
  description: 'Sign in to access IRMIN.',
  openGraph: {
    type: 'website',
  },
};

export default function SignInPage() {
  return <SignInSection />;
}
