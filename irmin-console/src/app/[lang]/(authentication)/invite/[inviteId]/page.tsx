import { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { currentUser } from '@clerk/nextjs/server';

import { TbX } from 'react-icons/tb';

import { getInvite } from '@/lib/actions/invites';

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

  // Find the user
  const user = await currentUser();
  if (!user) {
    // User needs to sign in to accept the invite
    // Redirect to sign in page
    redirect('/sign-in');
  }

  // Get the invite by ID
  const invite = await getInvite({ inviteID: params.inviteId });
  if (!invite || !invite.data) {
    return (
      <div className='container mx-auto my-8 max-w-3xl'>
        <div
          className='rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700'
          role='alert'
        >
          <div className='flex gap-4'>
            <TbX className='h-6 w-6 text-red-400' />
            <div>
              <p className='font-bold'>Invalid Invitation</p>
              <p className='text-sm'>
                The invitation link appears to be invalid or expired. Please
                contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AcceptInviteSection user={user} invite={invite.data} />;
}
