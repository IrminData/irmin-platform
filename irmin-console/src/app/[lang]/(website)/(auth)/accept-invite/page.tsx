import { Metadata } from 'next';

import UserInviteSection from '@/components/auth/userInviteSection';

export const metadata: Metadata = {
  title: 'Accept invite | IRMIN',
  description: 'Accept invite to access IRMIN.',
  openGraph: {
    type: 'website',
  },
};

export default function AcceptInvitePage() {
  return <UserInviteSection />;
}
