'use client';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display a warning when can't do something due to immutablity.
 */
const ImmutableWarning = () => {
  const { dict } = useLocale();
  return (
    <div className='bg-card w-full rounded-lg border border-gray-200 px-2 py-8 dark:border-gray-800'>
      <p className='text-card-foreground mx-auto mb-2 max-w-lg text-center text-lg lg:text-2xl'>
        {dict.repository.immutableWarning}
      </p>
      <p className='text-card-foreground/80 mx-auto max-w-lg text-center text-sm'>
        {dict.repository.immutableWarningDescription}
      </p>
    </div>
  );
};

export default ImmutableWarning;
