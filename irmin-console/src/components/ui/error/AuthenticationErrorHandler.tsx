'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@clerk/nextjs';

import { useLocale } from '@/context/LocaleContext';

import { CommonErrorDisplay } from './CommonErrorDisplay';

interface AuthenticationErrorHandlerProps {
  error?: Error;
  children: React.ReactNode;
}

// Public routes that don't require authentication (exact match)
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// Public route prefixes (matches the path and any sub-paths)
const PUBLIC_ROUTE_PREFIXES = ['/invite'];

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
  const { locale } = useLocale();
  // Check if current route is public (exact matches with optional language prefix)
  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => {
      // Exact match without language prefix
      if (pathname === route || pathname === `${route}/`) {
        return true;
      }

      // Exact match with language prefix (e.g., /en/sign-in, /es/sign-in/)
      // Special handling for root route to avoid double slash
      const routePattern = route === '/' ? '' : route;
      const langPrefixPattern = new RegExp(`^/[a-z]{2}${routePattern}(?:/)?$`);
      return langPrefixPattern.test(pathname);
    }) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => {
      // Match prefix and any sub-paths, with optional language prefix
      // e.g. /invite/abc, /en/invite/abc
      return (
        pathname === prefix ||
        pathname.startsWith(`${prefix}/`) ||
        new RegExp(`^/[a-z]{2}${prefix}(/.*)?$`).test(pathname)
      );
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

      // Only redirect to sign-in if the user is actually not signed in.
      // If signed in but API is down, redirecting creates a loop since
      // Clerk auto-redirects signed-in users away from sign-in.
      if (!isPublicRoute && isLoaded && !isSignedIn) {
        router.replace(`/${locale}/sign-in`);
        return;
      }
    }

    // Redirect unauthenticated users on protected routes
    if (isLoaded && !isSignedIn && !isPublicRoute) {
      router.replace(`/${locale}/sign-in`);
    }
  }, [error, isSignedIn, isLoaded, isPublicRoute, router, locale]);

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
    // Signed in but error (e.g. API unreachable) — show service unavailable
    // instead of redirecting to sign-in, which would cause a redirect loop
    if (isSignedIn && error) {
      return (
        <CommonErrorDisplay
          error={error}
          title='Service Unavailable'
          description='The service is temporarily unavailable. Please try again in a moment.'
          variant='section'
          showDetails={!!error}
          showReload={true}
          showHome={false}
          showReport={true}
          onRetry={() => {
            window.location.reload();
          }}
          className='min-h-[300px]'
        />
      );
    }

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
            router.push(`/${locale}/sign-in`);
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
