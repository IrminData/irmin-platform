/* eslint-disable import-x/no-unused-modules */
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

import type { Locale } from '@/lib/dict';
import { defaultLocale, detectLocaleFromURL, languages } from '@/lib/dict';

// Environment variables for environment authentication
const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'false';
const appPassword = process.env.ENV_PASSWORD;

// Validate that password is set when auth is required
if (
  requireAuth === 'true' &&
  !appPassword &&
  process.env.NODE_ENV === 'production'
) {
  throw new Error(
    'ENV_PASSWORD environment variable must be set when REQUIRE_ENV_AUTH is true in production'
  );
}

// List of available locales
const locales: Locale[] = languages.map((lang) => lang.code);

/**
 * Get the preferred locale from the Accept-Language header
 * @param request - The request object
 * @returns The users preferred locale, or defaultLocale if not found
 */
function getLocaleFromHeader(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const preferredLocale = acceptLanguage
    .split(',')
    .map((lang) => lang.split(';')[0].trim())
    .find((lang): lang is Locale => locales.includes(lang as Locale));

  return preferredLocale ?? defaultLocale;
}

/**
 * Get the locale from the cookies
 * @param request - The request object
 * @returns The locale from the cookies or null if not found or invalid
 */
function getLocaleFromCookies(request: NextRequest): Locale | null {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (!cookieLocale) {
    return null;
  }

  // Validate that the cookie locale is in the list of supported locales
  const isValidLocale = locales.includes(cookieLocale as Locale);
  return isValidLocale ? (cookieLocale as Locale) : null;
}

/**
 * Set the user's preferred locale in a cookie for 1 year
 * @param response - The response object
 * @param locale - The locale to set in the cookie
 */
function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Get locale from request (cookies or headers)
 *
 * @remarks
 * Fallback priority: Cookie → Accept-Language header → defaultLocale
 *
 * @param request - The request object
 * @returns The locale (guaranteed to be valid, falls back to defaultLocale)
 */
export function getLocale(request: NextRequest): Locale {
  return getLocaleFromCookies(request) ?? getLocaleFromHeader(request);
}

// Protected routes (Clerk)
const isProtectedRoute = createRouteMatcher([
  '/:lang([a-z]{2})?/:section(workspace|profile)/:rest*',
]);

/** Maximum time to wait for Clerk auth resolution before falling back */
const MIDDLEWARE_TIMEOUT_MS = 5000;

const clerkHandler = clerkMiddleware(async (auth, req) => {
  let resolvedAuth;
  try {
    resolvedAuth = await auth();
  } catch {
    // Clerk auth resolution failed (API unreachable, expired token, etc.)
    if (isProtectedRoute(req)) {
      const locale = getLocale(req);
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url));
    }
    return NextResponse.next();
  }

  // Protect certain routes using Clerk
  if (isProtectedRoute(req) && !resolvedAuth.userId) {
    resolvedAuth.redirectToSignIn();
    return;
  }

  const { pathname, searchParams } = req.nextUrl;
  const { cookies } = req;

  // Skip env auth for Clerk handshake requests to prevent redirect loops
  const isClerkHandshake = searchParams.has('__clerk_hs_reason');
  if (isClerkHandshake) {
    return NextResponse.next();
  }

  // If accessing /api routes, skip the rest of the middleware
  if (pathname.startsWith('/api')) return NextResponse.next();

  const isTsDocsPath =
    pathname.startsWith('/frontend-docs') || pathname.startsWith('/tsdocs');

  // Handle dev environment authentication if it's required or if trying to access TSDoc paths
  if (requireAuth === 'true' || isTsDocsPath) {
    // Skip auth check if no password is configured and auth is not required
    if (!appPassword) {
      if (requireAuth === 'true' && process.env.NODE_ENV === 'production') {
        return NextResponse.redirect(
          new URL('/api/verify-env-access', req.url)
        );
      }
      // Allow access when no password is set and auth is not required, or in development
    } else {
      const authorisedDev = cookies.get('authorisedDev');
      if (
        !authorisedDev ||
        (authorisedDev.value !== appPassword &&
          authorisedDev.value !== 'no-auth-required')
      ) {
        return NextResponse.redirect(
          new URL('/api/verify-env-access', req.url)
        );
      }
    }
  }

  // If accessing TSDoc paths, skip the rest of the middleware, but handle redirects
  if (isTsDocsPath) {
    // Redirect to /frontend-docs/index.html for specific TSDoc home page
    const isTsdocHome = pathname === '/frontend-docs' || pathname === '/tsdocs';
    if (isTsdocHome) {
      return NextResponse.redirect(
        new URL('/frontend-docs/index.html', req.url)
      );
    }

    // Redirect /tsdocs/* to /frontend-docs/*
    if (pathname.startsWith('/tsdocs')) {
      return NextResponse.redirect(
        new URL(pathname.replace('/tsdocs', '/frontend-docs'), req.url)
      );
    }

    // Skip the rest of the middleware
    return NextResponse.next();
  }

  // Get locale from the URL using the detectLocaleFromURL function
  const urlLocale = detectLocaleFromURL(req.url);

  const response = NextResponse.next();

  // If URL has a locale, use it and update the cookie
  if (urlLocale) {
    setLocaleCookie(response, urlLocale);
    return response;
  }

  // Get the locale from cookies (user preference), then headers as fallback
  const locale = getLocale(req);

  // Redirect to the correct locale if not found in the URL
  req.nextUrl.pathname = `/${locale}${pathname}`;
  setLocaleCookie(response, locale);
  return NextResponse.redirect(req.nextUrl);
});

/**
 * Middleware wrapper with graceful fallback for Clerk failures.
 *
 * @remarks
 * When Clerk's API is unreachable (e.g., network issues, expired tokens),
 * the handshake can take 10+ seconds to timeout. This wrapper uses
 * Promise.race to enforce a shorter timeout, redirecting to sign-in
 * for protected routes instead of leaving the user waiting.
 */
export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  try {
    return await Promise.race([
      clerkHandler(req, event),
      new Promise<NextResponse>((resolve) =>
        setTimeout(() => {
          const { pathname } = req.nextUrl;
          // Let API and static asset requests pass through
          if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
            resolve(NextResponse.next());
            return;
          }
          const locale = getLocale(req);
          // Redirect protected routes to sign-in
          if (isProtectedRoute(req)) {
            resolve(
              NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url))
            );
          } else {
            resolve(NextResponse.next());
          }
        }, MIDDLEWARE_TIMEOUT_MS)
      ),
    ]);
  } catch {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }
    const locale = getLocale(req);
    if (isProtectedRoute(req)) {
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url));
    }
    return NextResponse.next();
  }
}

/**
 * Configuration for the middleware
 *
 * Match all request paths except for:
 * - ui-assets (UI assets)
 * - _next/static (static files)
 * - _next/image (image optimisation files)
 * - monitoring (sentry tunnel route)
 * - all .svg, .png, .jpg, .webp, .ico and .jpeg files
 * - sitemap.xml
 * - robots.txt
 *
 * {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 */
export const config = {
  matcher: [
    '/((?!ui-assets|_next/static|_next/image|monitoring|favicon.ico|[^/]+\\.svg|[^/]+\\.png|[^/]+\\.ico|[^/]+\\.jpg|[^/]+\\.webp|[^/]+\\.jpeg|sitemap\\.xml|robots\\.txt).*)',
  ],
};
