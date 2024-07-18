import { Metadata } from 'next';

import SignUpSection from '@/components/auth/signUpSection';

export const metadata: Metadata = {
  title: 'Create new account | IRMIN',
  description: 'Create a new account to access IRMIN.',
  openGraph: {
    type: 'website',
  },
};

export default function SignUpPage() {
  return <SignUpSection />;
}
