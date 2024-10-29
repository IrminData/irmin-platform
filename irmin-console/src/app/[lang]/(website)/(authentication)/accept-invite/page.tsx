import { Metadata } from 'next';

import { currentUser } from '@clerk/nextjs/server';

import { TbX } from 'react-icons/tb';

import { verifyInviteHash } from '@/lib/actions/invites';

import AcceptInviteSection from '@/components/user/AcceptInviteSection';

/**
 * Page metadata for SEO on the sign in page
 */
export const metadata: Metadata = {
  title: 'Accept invite | IRMIN',
  description: 'Accept an invite to access IRMIN.',
};

/**
 * Invite acceptance page
 */
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { hash } = await searchParams;
  const user = await currentUser();
  const res = await verifyInviteHash(hash as string);
  if (!res.data) {
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
  return (
    <AcceptInviteSection
      user={user ?? undefined}
      invitePayload={res.data}
      hash={hash as string}
    />
  );
}
