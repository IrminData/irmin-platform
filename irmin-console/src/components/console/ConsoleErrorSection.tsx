'use client';

import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';

import { useLocale } from '@/context/LocaleContext';

/**
 * Modern error UI for the console
 */
function ConsoleErrorSection({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useLocale();

  return (
    <div
      className={`
        flex min-h-[60vh] items-center justify-center bg-background p-4
      `}
    >
      <LocalizedErrorDisplay
        error={error}
        title={dict.common.somethingWentWrong}
        description={dict.common.weEncounteredError}
        variant='page'
        showDetails={true}
        showReload={true}
        showHome={true}
        showReport={true}
        onRetry={reset}
        className='w-full max-w-2xl'
      />
    </div>
  );
}

export default ConsoleErrorSection;
