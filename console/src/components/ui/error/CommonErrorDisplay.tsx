'use client';

import { useCallback, useState } from 'react';

import {
  TbAlertTriangle,
  TbBug,
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbHome,
  TbRefresh,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Hook that returns the standard `translations` object built from the active
 * locale's dict. Use this inside any component that renders
 * {@link CommonErrorDisplay} while wrapped in the LocaleProvider.
 *
 * Uses optional chaining for every lookup so the hook degrades gracefully
 * when rendered outside a LocaleProvider (where `useLocale()` returns the
 * context default `{ dict: {} as Dictionary }`). Missing keys come back
 * as `undefined`, and {@link CommonErrorDisplay} falls through to its
 * hardcoded English defaults — no throw. For a first-class server-side
 * render outside the provider (e.g. global-error.tsx), construct
 * translations manually using {@link getDictionary}.
 */
export function useCommonErrorTranslations(): CommonErrorDisplayProps['translations'] {
  const { dict } = useLocale();
  const common = dict.common;
  return {
    somethingWentWrong: common?.somethingWentWrong,
    error: common?.error,
    weEncounteredError: common?.weEncounteredError,
    tryAgain: common?.tryAgain,
    goBackHome: common?.goBackHome,
    reportIssue: common?.reportIssue,
    hideDetails: common?.hideDetails,
    showDetails: common?.showDetails,
    errorDetails: common?.errorDetails,
    copied: common?.copied,
    copy: common?.copy,
    stackTrace: common?.stackTrace,
  };
}

/**
 * Convenience wrapper around {@link CommonErrorDisplay} that auto-wires the
 * `translations` prop from the active locale via {@link useCommonErrorTranslations}.
 *
 * Use this anywhere inside the LocaleProvider. For rendering outside the
 * provider (e.g. global-error.tsx / WebsiteError) use {@link CommonErrorDisplay}
 * directly with an explicit `translations` prop.
 */
export function LocalizedErrorDisplay(
  props: Omit<CommonErrorDisplayProps, 'translations'>
) {
  const translations = useCommonErrorTranslations();
  return <CommonErrorDisplay {...props} translations={translations} />;
}

interface CommonErrorDisplayProps {
  error?: Error | null;
  title?: string;
  description?: string;
  variant?: 'component' | 'inline' | 'page' | 'section';
  showDetails?: boolean;
  showReload?: boolean;
  showHome?: boolean;
  showReport?: boolean;
  onRetry?: () => void;
  onReport?: () => void;
  className?: string;
  // Optional translations override
  translations?: {
    somethingWentWrong?: string;
    error?: string;
    weEncounteredError?: string;
    tryAgain?: string;
    goBackHome?: string;
    reportIssue?: string;
    hideDetails?: string;
    showDetails?: string;
    errorDetails?: string;
    copied?: string;
    copy?: string;
    stackTrace?: string;
  };
}

// Default English translations
const defaultTranslations = {
  somethingWentWrong: 'Something went wrong',
  error: 'Error',
  weEncounteredError:
    "We couldn't complete that action. Try again, or refresh the page if it keeps happening.",
  tryAgain: 'Try Again',
  goBackHome: 'Go Back Home',
  reportIssue: 'Report Issue',
  hideDetails: 'Hide Details',
  showDetails: 'Show Details',
  errorDetails: 'Error Details',
  copied: 'Copied',
  copy: 'Copy',
  stackTrace: 'Stack Trace',
};

/**
 * Common error display component inspired by Vercel, Linear, and Neon
 *
 * Features:
 * - Clean, modern design with proper spacing and typography
 * - Expandable error details
 * - Multiple action buttons
 * - Responsive design
 * - Consistent with modern web app patterns
 * - Follows React Rules of Hooks
 * - Uses prop-based translations for flexibility
 */
export function CommonErrorDisplay({
  error,
  title,
  description,
  variant = 'section',
  showDetails = true,
  showReload = true,
  showHome = false,
  showReport = false,
  onRetry,
  onReport,
  className = '',
  translations,
}: CommonErrorDisplayProps) {
  // Merge provided translations with defaults. Strip undefined entries
  // first so a partial/misshapen translations object (e.g. from rendering
  // outside LocaleProvider) can't blank out the English fallbacks.
  const definedTranslations = translations
    ? Object.fromEntries(
        Object.entries(translations).filter(([, v]) => v !== undefined)
      )
    : {};
  const dict = { ...defaultTranslations, ...definedTranslations };

  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    if (!error) return;

    const errorText = `Error: ${error.message}\n\nStack Trace:\n${error.stack}`;

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  }, [error]);

  const handleReport = useCallback(() => {
    if (onReport) {
      onReport();
    } else {
      // Default report action - copy error details
      copyToClipboard();
    }
  }, [onReport, copyToClipboard]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'page':
        return {
          container: 'min-h-[60vh] py-12',
          content: 'max-w-lg mx-auto',
          title: 'text-2xl font-semibold',
          description: 'text-lg',
          spacing: 'space-y-6',
        };
      case 'section':
        return {
          container: 'min-h-[300px] py-8',
          content: 'max-w-md mx-auto',
          title: 'text-xl font-semibold',
          description: 'text-base',
          spacing: 'space-y-4',
        };
      case 'component':
        return {
          container: 'min-h-[200px] py-6',
          content: 'max-w-sm mx-auto',
          title: 'text-lg font-medium',
          description: 'text-sm',
          spacing: 'space-y-3',
        };
      case 'inline':
        return {
          container: 'py-4',
          content: 'max-w-full',
          title: 'text-base font-medium',
          description: 'text-sm',
          spacing: 'space-y-2',
        };
      default:
        return {
          container: 'min-h-[300px] py-8',
          content: 'max-w-md mx-auto',
          title: 'text-xl font-semibold',
          description: 'text-base',
          spacing: 'space-y-4',
        };
    }
  };

  const styles = getVariantStyles();

  const defaultTitle = () => {
    switch (variant) {
      case 'page':
        return dict.somethingWentWrong;
      case 'section':
        return dict.error;
      case 'component':
        return dict.error;
      case 'inline':
        return dict.error;
      default:
        return dict.error;
    }
  };

  const defaultDescription = () => {
    switch (variant) {
      case 'page':
        return dict.weEncounteredError;
      case 'section':
        return 'Something went wrong while loading. Try refreshing the page.';
      case 'component':
        return 'Something went wrong while loading.';
      case 'inline':
        return error?.message || 'An error occurred.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `}
    >
      <div
        className={`
          w-full
          ${styles.content}
          ${styles.spacing}
        `}
      >
        {/* Error Icon */}
        <div className='mb-4 flex justify-center'>
          <div className='relative'>
            <div
              className={`
                flex size-16 items-center justify-center rounded-full
                bg-destructive/10
              `}
            >
              <TbAlertTriangle className='size-8 text-destructive' />
            </div>
            {/* Subtle background glow */}
            <div
              className={`
                absolute inset-0 -z-10 size-16 rounded-full bg-destructive/5
                blur-xl
              `}
            />
          </div>
        </div>

        {/* Error Title */}
        <h2
          className={`
            text-foreground
            ${styles.title}
            tracking-tight
          `}
        >
          {title || defaultTitle()}
        </h2>

        {/* Error Description */}
        <p
          className={`
            text-muted-foreground
            ${styles.description}
            leading-relaxed
          `}
        >
          {description || defaultDescription()}
        </p>

        {/* Action Buttons */}
        <div
          className={`
            flex flex-col justify-center gap-2
            sm:flex-row
          `}
        >
          {showReload && onRetry && (
            <Button
              variant='default'
              size='sm'
              onClick={onRetry}
              className='inline-flex items-center gap-2'
            >
              <TbRefresh className='size-4' />
              {dict.tryAgain}
            </Button>
          )}

          {showHome && (
            <Button
              variant='outline'
              size='sm'
              href='/'
              className='inline-flex items-center gap-2'
            >
              <TbHome className='size-4' />
              {dict.goBackHome}
            </Button>
          )}

          {showReport && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleReport}
              className='inline-flex items-center gap-2'
            >
              <TbBug className='size-4' />
              {dict.reportIssue}
            </Button>
          )}
        </div>

        {/* Error Details (Expandable) */}
        {showDetails && error && (
          <div className='mt-6 w-full'>
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className={`
                inline-flex items-center gap-2 text-sm text-muted-foreground
                transition-colors
                hover:text-foreground
              `}
            >
              {showErrorDetails ? (
                <>
                  <TbChevronUp className='size-4' />
                  {dict.hideDetails}
                </>
              ) : (
                <>
                  <TbChevronDown className='size-4' />
                  {dict.showDetails}
                </>
              )}
            </button>

            {showErrorDetails && (
              <div className='mt-3 rounded-lg bg-muted/50 p-4 text-left'>
                <div className='mb-2 flex items-start justify-between'>
                  <span
                    className={`
                      text-xs font-medium tracking-wide text-muted-foreground
                      uppercase
                    `}
                  >
                    {dict.errorDetails}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className={`
                      inline-flex items-center gap-1 text-xs
                      text-muted-foreground transition-colors
                      hover:text-foreground
                    `}
                  >
                    {copied ? (
                      <>
                        <TbCheck className='size-3' />
                        {dict.copied}
                      </>
                    ) : (
                      <>
                        <TbCopy className='size-3' />
                        {dict.copy}
                      </>
                    )}
                  </button>
                </div>
                <div
                  className={`
                    overflow-x-auto rounded-sm border bg-background/50 p-3
                    font-mono text-sm text-foreground
                  `}
                >
                  <div className='mb-1 font-semibold text-destructive'>
                    {error.name || 'Error'}
                  </div>
                  <div className='mb-2 text-muted-foreground'>
                    {error.message}
                  </div>
                  {error.stack && (
                    <details className='text-xs text-muted-foreground'>
                      <summary
                        className={`
                          cursor-pointer
                          hover:text-foreground
                        `}
                      >
                        {dict.stackTrace}
                      </summary>
                      <pre className='mt-1 text-xs whitespace-pre-wrap'>
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
