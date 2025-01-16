import { Metadata } from 'next';

import ProfileSection from '@/components/user/ProfileSection';

/**
 * Page metadata for SEO on the profile page
 */
export const metadata: Metadata = {
  title: 'My profile | IRMIN',
  description: 'Edit your profile settings and preferences on IRMIN.',
};

/**
 * User profile settings page
 */
export default function ProfilePage() {
  return <ProfileSection />;
}
