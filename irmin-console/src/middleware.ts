import type { NextRequest } from 'next/server';
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
const locales = languages.map((lang) => lang.code);

/**
 * Get the preferred locale from the Accept-Language header
 * @param request - The request object
 * @returns The users preferred locale
 */
function getLocaleFromHeader(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language');

  const preferredLocale: Locale | null = acceptLanguage
    ?.split(',')
    .map((lang) => lang.split(';')[0].trim())
    .find((lang) => locales.includes(lang as Locale)) as Locale;

  return preferredLocale ?? defaultLocale;
}

/**
 * Get the locale from the cookies
 * @param request - The request object
 * @returns The locale from the cookies or null if not found
 */
function getLocaleFromCookies(request: NextRequest): Locale | null {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  return null;
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

// Protected routes (Clerk)
const isProtectedRoute = createRouteMatcher([
  '/:lang([a-z]{2})?/:section(workspace|profile)/:rest*',
]);

/**
 * Main application middleware
 *
 * @remarks
 *
 * Middleware handles locale, Clerk, dev env auth and TSDoc path redirects.
 *
 * Env authentication is required for development environments and TSDoc paths.
 *
 * - Redirects to the correct locale if not found in the URL
 * - Redirects to the /api/verify-dev-access route if the user is not authenticated and the environment requires it or the path is a TSDoc path
 * - Redirects to the /frontend-docs/index.html route if the path is /frontend-docs or /tsdocs
 *
 * {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 * {@link https://clerk.com/docs/references/nextjs/clerk-middleware}
 */
export default clerkMiddleware(async (auth, req) => {
  const resolvedAuth = await auth();
  // Protect certain routes using Clerk
  if (isProtectedRoute(req) && !resolvedAuth.userId) {
    resolvedAuth.redirectToSignIn();
    return;
  }

  const { pathname } = req.nextUrl;
  const { cookies } = req;

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
          new URL('/api/verify-dev-access', req.url)
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
          new URL('/api/verify-dev-access', req.url)
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
  let locale = getLocaleFromCookies(req);
  if (!locale) {
    locale = getLocaleFromHeader(req);
  }

  // Redirect to the correct locale if not found in the URL
  req.nextUrl.pathname = `/${locale}${pathname}`;
  setLocaleCookie(response, locale);
  return NextResponse.redirect(req.nextUrl);
});

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
