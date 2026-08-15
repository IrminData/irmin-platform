'use client';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display a warning when can't do something due to immutablity.
 */
const ImmutableWarning = () => {
  const { dict } = useLocale();
  return (
    <div
      className={`w-full rounded-[2px] border border-border bg-card px-2 py-8`}
    >
      <p
        className={`
          mx-auto mb-2 max-w-lg text-center text-lg text-card-foreground
          lg:text-2xl
        `}
      >
        {dict.repository.immutableWarning}
      </p>
      <p
        className={`
          mx-auto max-w-lg text-center text-sm text-card-foreground/80
        `}
      >
        {dict.repository.immutableWarningDescription}
      </p>
    </div>
  );
};

export default ImmutableWarning;
