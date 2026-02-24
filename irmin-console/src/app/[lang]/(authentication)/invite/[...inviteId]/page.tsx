import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import AcceptInviteSection from '@/components/user/AcceptInviteSection';

/**
 * Page metadata for SEO on the sign in page
 */
export const metadata: Metadata = {
  title: 'You have been invited to join a workspace | IRMIN',
};

type InvitePageParams = {
  inviteId: string[];
  lang: string;
};

/**
 * Invite acceptance page
 */
export default async function InvitePage(props: {
  params: Promise<InvitePageParams>;
}) {
  const params = await props.params;
  const inviteId = params.inviteId?.[0];
  if (!inviteId) notFound();
  return <AcceptInviteSection inviteID={inviteId} />;
}
