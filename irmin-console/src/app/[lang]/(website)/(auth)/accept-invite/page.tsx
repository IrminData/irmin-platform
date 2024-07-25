import { Metadata } from 'next';

import UserInviteSection from '@/components/auth/userInviteSection';

/**
 * Page metadata for SEO on the accept invite page
 */
export const metadata: Metadata = {
  title: 'Accept invite | IRMIN',
  description: 'Accept invite to access IRMIN.',
  openGraph: {
    type: 'website',
  },
};

/**
 * Accept invite page (Website)
 */
export default function AcceptInvitePage() {
  return <UserInviteSection />;
}
