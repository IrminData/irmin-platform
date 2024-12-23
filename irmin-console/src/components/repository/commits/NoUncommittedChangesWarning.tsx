'use client';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display a warning when there are no uncommitted changes in the branch
 */
const NoUncommittedChangesWarning = () => {
  const { dict } = useLocale();
  return (
    <div className='w-full rounded-lg border border-gray-200 bg-card px-2 py-8 text-card-foreground dark:border-gray-800'>
      <p className='mx-auto mb-2 max-w-lg text-center text-lg lg:text-2xl'>
        {dict.repository.commit.noUncommittedChanges}
      </p>
      <p className='mx-auto max-w-lg text-center text-sm text-opacity-80'>
        {dict.repository.commit.noUncommittedChangesDescription}
      </p>
    </div>
  );
};

export default NoUncommittedChangesWarning;
