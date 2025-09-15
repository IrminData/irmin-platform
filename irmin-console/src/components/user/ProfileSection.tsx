'use client';

import NotificationsInbox from '@/components/NotificationsInbox';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useIAM } from '@/context/IAMContext';

import UserProfileForm from './UserProfileForm';

/**
 * User profile section
 */
export default function ProfileSection() {
  const { profile } = useIAM();
  return (
    <ContentWrapper wrapperClassName='py-8'>
      <div className='space-y-6'>
        {!profile ? (
          <LoadingSkeleton className='h-96 w-full' />
        ) : (
          <div className='space-y-6'>
            <UserProfileForm />
            <div className='border-t pt-6'>
              <NotificationsInbox profile={profile} />
            </div>
          </div>
        )}
      </div>
    </ContentWrapper>
  );
}
