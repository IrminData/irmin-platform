'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@clerk/nextjs';

import { usePopup } from '@/context/PopupContext';

import { CommonErrorDisplay } from './CommonErrorDisplay';

interface AuthenticationErrorHandlerProps {
  error?: Error;
  children: React.ReactNode;
}

/**
 * Authentication error handler for Clerk authentication
 *
 * This component wraps authentication-dependent content and handles
 * authentication errors gracefully, providing appropriate error messages
 * and recovery options.
 */
function AuthenticationErrorHandler({
  error,
  children,
}: AuthenticationErrorHandlerProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { irminAlert } = usePopup();

  useEffect(() => {
    if (error) {
      // Report authentication errors to Sentry if available
      if (typeof window !== 'undefined') {
        const sentry = (
          window as {
            Sentry?: {
              captureException: (error: Error, options?: object) => void;
            };
          }
        ).Sentry;
        if (sentry) {
          sentry.captureException(error, {
            tags: {
              errorBoundary: 'authentication',
              component: 'AuthenticationErrorHandler',
            },
            extra: {
              isSignedIn,
              isLoaded,
            },
          });
        }
      }

      // Show user-friendly error message
      irminAlert(
        'error',
        'Authentication failed. Please sign in again to continue.'
      );
    }
  }, [error, isSignedIn, isLoaded, irminAlert]);

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <div
          className={`
            size-8 animate-spin rounded-full border-b-2 border-primary
          `}
        />
      </div>
    );
  }

  // Handle authentication errors
  if (error || (!isSignedIn && isLoaded)) {
    const isAuthError =
      error?.message?.toLowerCase().includes('auth') ||
      error?.message?.toLowerCase().includes('sign') ||
      error?.message?.toLowerCase().includes('token') ||
      !isSignedIn;

    if (isAuthError) {
      return (
        <CommonErrorDisplay
          error={error}
          title='Authentication Required'
          description='You need to sign in to access this content. Please sign in and try again.'
          variant='section'
          showDetails={false}
          showReload={true}
          showHome={false}
          showReport={false}
          onRetry={() => {
            router.push('/sign-in');
          }}
          className='min-h-[300px]'
        />
      );
    }

    // Generic error fallback
    return (
      <CommonErrorDisplay
        error={error}
        title='Authentication Error'
        description='An authentication error occurred. Please try signing in again.'
        variant='section'
        showDetails={!!error}
        showReload={true}
        showHome={true}
        showReport={true}
        onRetry={() => {
          window.location.reload();
        }}
      />
    );
  }

  return <>{children}</>;
}

export default AuthenticationErrorHandler;
