import { NextRequest, NextResponse } from 'next/server';

import { defaultLocale, languages, Locale } from '@/dictionaries';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Environment variables for environment authentication
const authOfflineMode = process.env.NEXT_PUBLIC_AUTH_OFFLINE_MODE ?? 'false';
const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'true';
const appPassword = process.env.ENV_PASSWORD ?? 'oiDeNuDEvenTICYc';

// NormalList of available locales
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
const isProtectedRoute = createRouteMatcher(['/:lang([a-z]{2})/console(.*)']);

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
export default clerkMiddleware((auth, req) => {
  // Ignore route protection if in offline mode
  if (authOfflineMode !== 'true') {
    // Protect certain routes using Clerk
    if (isProtectedRoute(req)) auth().protect();
  }

  const { pathname } = req.nextUrl;
  const { cookies } = req;

  const isTsDocsPath =
    pathname.startsWith('/frontend-docs') || pathname.startsWith('/tsdocs');

  // Handle dev environment authentication if it's required or if trying to access TSDoc paths
  if (requireAuth === 'true' || isTsDocsPath) {
    const authorisedDev = cookies.get('authorisedDev');
    if (!authorisedDev || authorisedDev.value !== appPassword) {
      return NextResponse.redirect(new URL('/api/verify-dev-access', req.url));
    }
  }

  // If accessing /api routes, skip the rest of the middleware
  if (pathname.startsWith('/api')) return NextResponse.next();

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
        new URL(pathname.replace('/tsdoc', '/frontend-docs'), req.url)
      );
    }

    // Skip the rest of the middleware
    return NextResponse.next();
  }

  // Get locale from the URL
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  // Get the locale from cookies or headers
  let locale = getLocaleFromCookies(req);
  if (!locale) {
    locale = getLocaleFromHeader(req);
  }

  const response = NextResponse.next();

  // Redirect to the correct locale if not found in the URL
  if (!pathnameHasLocale) {
    req.nextUrl.pathname = `/${locale}${pathname}`;
    setLocaleCookie(response, locale);
    return NextResponse.redirect(req.nextUrl);
  }

  // If user manually switches locale (e.g., `/en` or `/fi` directly in the URL)
  const manualSwitchLocale = locales.find((locale) =>
    pathname.startsWith(`/${locale}`)
  );
  if (manualSwitchLocale) {
    setLocaleCookie(response, manualSwitchLocale);
  }

  return response;
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
