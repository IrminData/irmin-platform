import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { defaultLocale, languages, Locale } from '@/dictionaries';

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

/**
 * Main application middleware
 *
 * @remarks
 *
 * Middleware handles locale and dev env authentication.
 * Authentication is required for development environments and TSDoc paths.
 *
 * - Redirects to the correct locale if not found in the URL
 * - Redirects to the /api/verify-dev-access route if the user is not authenticated and the environment requires it or the path is a TSDoc path
 * - Redirects to the /frontend-docs/index.html route if the path is /frontend-docs or /tsdocs
 *
 * {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 *
 * @param req - The request object
 * @returns The response object
 */
export function middleware(req: NextRequest) {
  const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'true';
  const appPassword = process.env.ENV_PASSWORD ?? 'oiDeNuDEvenTICYc';

  const { pathname } = req.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  const isTsdocHome = pathname === '/frontend-docs' || pathname === '/tsdocs';
  const isTsdocPath = pathname.startsWith('/frontend-docs');

  let locale = getLocaleFromCookies(req);
  if (!locale) {
    locale = getLocaleFromHeader(req);
  }

  const response = NextResponse.next();

  // Redirect to /frontend-docs/index.html for specific TSDoc home page
  if (isTsdocHome) {
    return NextResponse.redirect(new URL('/frontend-docs/index.html', req.url));
  }

  // Locale handling
  if (!pathnameHasLocale && !isTsdocPath) {
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

  // Authentication handling
  if (requireAuth === 'true' || isTsdocPath) {
    const { cookies } = req;
    const authorizedDev = cookies.get('authorizedDev');
    if (!authorizedDev || authorizedDev.value !== appPassword) {
      return NextResponse.redirect(new URL('/api/verify-dev-access', req.url));
    }
  }

  return response;
}

/**
 * Configuration for the middleware
 *
 * @remarks
 *
 * Match all request paths except for the ones starting with:
 * - api (API routes)
 * - ui-assets (UI assets)
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * Or specific files:
 * - all .svg, .png, .jpg, .webp and .jpeg files
 * - sitemap.xml
 * - robots.txt
 *
 * {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 */
export const config = {
  matcher: [
    '/((?!api|ui-assets|_next/static|_next/image|favicon.ico|[^/]+\\.svg|[^/]+\\.png|[^/]+\\.jpg|[^/]+\\.webp|[^/]+\\.jpeg|sitemap\\.xml|robots\\.txt).*)',
  ],
};
