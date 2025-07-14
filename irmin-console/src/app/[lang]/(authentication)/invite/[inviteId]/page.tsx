import type { Metadata } from 'next';

import AcceptInviteSection from '@/components/user/AcceptInviteSection';

/**
 * Page metadata for SEO on the sign in page
 */
export const metadata: Metadata = {
  title: 'You have been invited to join a workspace | IRMIN',
};

type InvitePageParams = {
  inviteId: string;
  lang: string;
};

/**
 * Invite acceptance page
 */
export default async function InvitePage(props: {
  params: Promise<InvitePageParams>;
}) {
  const params = await props.params;
  return <AcceptInviteSection inviteID={params.inviteId} />;
}
