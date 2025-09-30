'use client';

import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';

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

  // Prepare translations for CommonErrorDisplay
  const translations = {
    somethingWentWrong: dict.common.somethingWentWrong,
    error: dict.common.error,
    weEncounteredError: dict.common.weEncounteredError,
    tryAgain: dict.common.tryAgain,
    goBackHome: dict.common.goBackHome,
    reportIssue: dict.common.reportIssue,
    hideDetails: dict.common.hideDetails,
    showDetails: dict.common.showDetails,
    errorDetails: dict.common.errorDetails,
    copied: dict.common.copied,
    copy: dict.common.copy,
    stackTrace: dict.common.stackTrace,
  };

  return (
    <div
      className={`
        flex min-h-[60vh] items-center justify-center bg-background p-4
      `}
    >
      <CommonErrorDisplay
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
        translations={translations}
      />
    </div>
  );
}

export default ConsoleErrorSection;
