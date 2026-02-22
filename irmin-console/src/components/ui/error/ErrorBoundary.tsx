'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'component' | 'page' | 'section';
  title?: string;
  description?: string;
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
  className = '',
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  level?: 'component' | 'page' | 'section';
  title?: string;
  description?: string;
  className?: string;
}) {
  const getDefaultTitle = () => {
    switch (level) {
      case 'page':
        return 'Page Error';
      case 'section':
        return 'Section Error';
      case 'component':
      default:
        return 'Component Error';
    }
  };

  const getDefaultDescription = () => {
    switch (level) {
      case 'page':
        return 'This page encountered an error. Please try refreshing or contact support if the problem persists.';
      case 'section':
        return 'This section encountered an error. Please try refreshing.';
      case 'component':
      default:
        return 'This component encountered an error.';
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
          {title || getDefaultTitle()}
        </h2>
        <p className='text-muted-foreground'>
          {description || getDefaultDescription()}
        </p>
        <button
          onClick={onReset}
          className={`
            rounded-md bg-primary px-4 py-2 text-primary-foreground
            transition-colors
            hover:bg-primary/90
          `}
        >
          Try Again
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
