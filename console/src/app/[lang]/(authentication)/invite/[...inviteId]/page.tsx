import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getServerDict } from '@/lib/dict/server';

import AcceptInviteSection from '@/components/user/AcceptInviteSection';

type InvitePageParams = {
  inviteId: string[];
  lang: string;
};

export async function generateMetadata(props: {
  params: Promise<InvitePageParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.auth.invite };
}

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
