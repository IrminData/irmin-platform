'use client';

import ContentWrapper from '@/components/ui/ContentWrapper';
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
      {!profile ? (
        <LoadingSkeleton className='h-96 w-full' />
      ) : (
        <UserProfileForm />
      )}
    </ContentWrapper>
  );
}
