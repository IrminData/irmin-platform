'use client';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display a warning when there are no uncommited changes in the branch
 */
const NoUncommitedChangesWarning = () => {
  const { dict } = useLocale();
  return (
    <div className='w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-8 dark:border-gray-800 dark:bg-irmin_black'>
      <p className='mx-auto mb-2 max-w-lg text-center text-lg text-gray-600 lg:text-2xl dark:text-gray-300'>
        {dict.repository.commit.noUncommitedChanges}
      </p>
      <p className='mx-auto max-w-lg text-center text-sm text-gray-600 dark:text-gray-300'>
        {dict.repository.commit.noUncommitedChangesDescription}
      </p>
    </div>
  );
};

export default NoUncommitedChangesWarning;
