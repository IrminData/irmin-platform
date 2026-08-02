'use client';

import type { Locale } from '@/lib/dict';
import { getDictionary } from '@/lib/dict';

import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';

/**
 * Modern error UI for the website
 */
export default function WebsiteError({
  locale,
  pageNotFound,
  error,
  reset,
}: {
  locale: Locale;
  pageNotFound?: boolean;
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  const dict = getDictionary(locale);

  const title = pageNotFound
    ? `${dict.common.pageNotFound} - 404`
    : `${dict.common.somethingWentWrong} - 500`;

  const description = pageNotFound
    ? dict.common.pageNotFoundDescription
    : dict.common.weEncounteredError;

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
        flex min-h-screen items-center justify-center bg-background p-4
      `}
    >
      <CommonErrorDisplay
        error={error}
        title={title}
        description={description}
        variant='page'
        showDetails={!pageNotFound}
        showReload={!pageNotFound}
        showHome={true}
        showReport={!pageNotFound}
        onRetry={reset}
        className='w-full max-w-2xl'
        translations={translations}
      />
    </div>
  );
}
