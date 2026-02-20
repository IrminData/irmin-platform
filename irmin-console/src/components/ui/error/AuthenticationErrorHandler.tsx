'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@clerk/nextjs';

import { CommonErrorDisplay } from './CommonErrorDisplay';

interface AuthenticationErrorHandlerProps {
  error?: Error;
  children: React.ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/invite',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

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
  const pathname = usePathname();
  // Check if current route is public (exact matches with optional language prefix)
  const isPublicRoute = PUBLIC_ROUTES.some((route) => {
    // Exact match without language prefix
    if (pathname === route || pathname === `${route}/`) {
      return true;
    }

    // Exact match with language prefix (e.g., /en/sign-in, /es/sign-in/)
    // Special handling for root route to avoid double slash
    const routePattern = route === '/' ? '' : route;
    const langPrefixPattern = new RegExp(`^/[a-z]{2}${routePattern}(?:/)?$`);
    return langPrefixPattern.test(pathname);
  });

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

      // Auto-redirect to sign-in on auth errors for protected routes
      if (!isPublicRoute) {
        router.replace('/sign-in');
        return;
      }
    }

    // Redirect unauthenticated users on protected routes
    if (isLoaded && !isSignedIn && !isPublicRoute) {
      router.replace('/sign-in');
    }
  }, [error, isSignedIn, isLoaded, isPublicRoute, router]);

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

  // Handle authentication errors - only block protected routes
  if (!isPublicRoute && (error || (!isSignedIn && isLoaded))) {
    const isAuthError =
      error?.message?.toLowerCase().includes('auth') ||
      error?.message?.toLowerCase().includes('sign') ||
      error?.message?.toLowerCase().includes('token') ||
      (!isSignedIn && !isPublicRoute);

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
