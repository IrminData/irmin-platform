'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import * as Sentry from '@sentry/nextjs';

import { TbAlertTriangle } from 'react-icons/tb';

import type { Dictionary } from '@/lib/dict';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Keys under `dict.common.errors` whose values are plain strings — i.e.
 * the translation keys that can be used as `titleKey` / `descriptionKey`
 * on {@link ErrorBoundary}.
 */
type ErrorDictStringKey = {
  [
    K in keyof Dictionary['common']['errors']
  ]: Dictionary['common']['errors'][K] extends string ? K : never;
}[keyof Dictionary['common']['errors']];

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'component' | 'page' | 'section';
  /**
   * Resolved title string. Evaluated in the parent component's render —
   * keep it cheap; an expensive or throwing expression here will prevent
   * the boundary from mounting. Prefer {@link titleKey} for translated
   * fallbacks so the dict lookup only happens on the error path.
   */
  title?: string;
  /** See {@link title}. */
  description?: string;
  /**
   * Translation key under `dict.common.errors.*`. Resolved lazily inside
   * the fallback (only on error), so the wrapper component stays pure
   * and the boundary always mounts even if the locale dict is misshapen.
   */
  titleKey?: ErrorDictStringKey;
  /** See {@link titleKey}. */
  descriptionKey?: ErrorDictStringKey;
  className?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Proper React Error Boundary class component
 *
 * This is the correct way to implement error boundaries in React.
 * It catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component
 * tree that crashed.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: this.props.level || 'component',
        component: 'ErrorBoundary',
      },
      extra: {
        errorInfo,
        componentStack: errorInfo.componentStack,
      },
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
          level={this.props.level}
          title={this.props.title}
          description={this.props.description}
          titleKey={this.props.titleKey}
          descriptionKey={this.props.descriptionKey}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

// Fallback component for error boundary
function ErrorBoundaryFallback({
  error,
  errorInfo,
  onReset,
  level = 'component',
  title,
  description,
  titleKey,
  descriptionKey,
  className = '',
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  level?: 'component' | 'page' | 'section';
  title?: string;
  description?: string;
  titleKey?: ErrorDictStringKey;
  descriptionKey?: ErrorDictStringKey;
  className?: string;
}) {
  // Lazy dict lookup — only runs when the boundary has already caught an
  // error, so a throw here can't prevent the boundary from mounting.
  // Consumers outside a LocaleProvider receive the context's default-locale
  // dictionary, so even emergency UI remains readable and localized.
  const { dict } = useLocale();
  const resolvedTitle =
    title ?? (titleKey ? dict.common?.errors?.[titleKey] : undefined);
  const resolvedDescription =
    description ??
    (descriptionKey ? dict.common?.errors?.[descriptionKey] : undefined);

  const getDefaultTitle = () => {
    switch (level) {
      case 'page':
        return dict.common.errors.consoleTitle;
      case 'section':
        return dict.common.somethingWentWrong;
      case 'component':
      default:
        return dict.common.weEncounteredError;
    }
  };

  const getDefaultDescription = () => {
    switch (level) {
      case 'page':
        return dict.common.errors.consoleDescription;
      case 'section':
        return dict.common.tryAgainOrContactSupport;
      case 'component':
      default:
        return dict.common.tryAgainOrContactSupport;
    }
  };

  const getLevelClasses = () => {
    switch (level) {
      case 'page':
        return 'min-h-screen flex items-center justify-center';
      case 'section':
        return 'min-h-[200px] flex items-center justify-center';
      case 'component':
      default:
        return 'min-h-[100px] flex items-center justify-center';
    }
  };

  return (
    <div
      className={`
        animate-in fade-in-60
        ${getLevelClasses()}
        ${className}
      `}
    >
      <div className='mx-auto max-w-md space-y-4 p-6 text-center'>
        <TbAlertTriangle
          aria-hidden='true'
          className='mx-auto mb-4 size-10 text-destructive'
        />
        <h2 className='text-xl font-semibold text-foreground'>
          {resolvedTitle || getDefaultTitle()}
        </h2>
        <p className='text-muted-foreground'>
          {resolvedDescription || getDefaultDescription()}
        </p>
        <Button onClick={onReset} variant='accent'>
          {dict.common.tryAgain}
        </Button>
        {process.env.NODE_ENV === 'development' && error && (
          <details className='mt-4 text-left text-sm'>
            <summary
              className={`
                cursor-pointer text-muted-foreground
                hover:text-foreground
              `}
            >
              {dict.common.errorDetails}
            </summary>
            <pre className='mt-2 overflow-auto rounded-[2px] bg-muted p-2 text-xs'>
              {error.message}
              {error.stack && `\n\n${dict.common.stackTrace}:\n${error.stack}`}
              {errorInfo?.componentStack &&
                `\n\n${dict.common.errorDetails}:${errorInfo.componentStack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
