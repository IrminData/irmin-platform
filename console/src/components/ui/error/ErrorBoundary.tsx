'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import * as Sentry from '@sentry/nextjs';

import type { Dictionary } from '@/lib/dict';

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
  // Guarded with optional chaining in case the consumer renders the
  // boundary outside a LocaleProvider (context default is `{}`).
  const { dict } = useLocale();
  const resolvedTitle =
    title ?? (titleKey ? dict.common?.errors?.[titleKey] : undefined);
  const resolvedDescription =
    description ??
    (descriptionKey ? dict.common?.errors?.[descriptionKey] : undefined);

  const getDefaultTitle = () => {
    switch (level) {
      case 'page':
        return 'Something went wrong';
      case 'section':
        return "Couldn't load this section";
      case 'component':
      default:
        return "Couldn't load";
    }
  };

  const getDefaultDescription = () => {
    switch (level) {
      case 'page':
        return "We couldn't load this page. Try refreshing — if it keeps happening, contact support.";
      case 'section':
        return 'Something went wrong while loading. Try refreshing the page.';
      case 'component':
      default:
        return 'Something went wrong while loading.';
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
        <div className='mb-4 text-4xl text-red-500'>⚠️</div>
        <h2 className='text-xl font-semibold text-foreground'>
          {resolvedTitle || getDefaultTitle()}
        </h2>
        <p className='text-muted-foreground'>
          {resolvedDescription || getDefaultDescription()}
        </p>
        <button
          onClick={onReset}
          className={`
            rounded-md bg-primary px-4 py-2 text-primary-foreground
            transition-colors
            hover:bg-primary/90
          `}
        >
          {dict.common?.tryAgain ?? 'Try again'}
        </button>
        {process.env.NODE_ENV === 'development' && error && (
          <details className='mt-4 text-left text-sm'>
            <summary
              className={`
                cursor-pointer text-muted-foreground
                hover:text-foreground
              `}
            >
              Error Details (Development)
            </summary>
            <pre className='mt-2 overflow-auto rounded-sm bg-muted p-2 text-xs'>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
              {errorInfo?.componentStack &&
                `\n\nComponent Stack:${errorInfo.componentStack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
