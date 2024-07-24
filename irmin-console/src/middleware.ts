import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { defaultLocale, languages, Locale } from '@/dictionaries';

const locales = languages.map((lang) => lang.code);

/**
 * Get the preferred locale from the Accept-Language header
 * @param {NextRequest} request - The request object
 * @returns {Locale} preferredLocale - The users preferred locale
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
 * @param {NextRequest} request - The request object
 * @returns {Locale | null} locale - The locale from the cookies or null if not found
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
 * @param {NextResponse} response - The response object
 * @param {Locale} locale - The locale to set in the cookie
 */
function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Middleware for handling locale and authentication (for development environment and internal routes)
 * Redirects to the correct locale if not found in the URL
 * Redirects to the /api/verify-dev-access route if the user is not authenticated and the environment requires it or the path is a TSDoc path
 * Redirects to the /frontend-docs/index.html route if the path is /frontend-docs or /tsdocs
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 * @param {NextRequest} req - The request object
 * @returns {NextResponse} response - The response object
 */
export function middleware(req: NextRequest) {
  const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'true';
  const appPassword = process.env.ENV_PASSWORD ?? 'oiDeNuDEvenTICYc';

  const { pathname } = req.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  let locale = getLocaleFromCookies(req);
  if (!locale) {
    locale = getLocaleFromHeader(req);
  }

  const response = NextResponse.next();

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

  // Authentication handling
  if (requireAuth === 'true') {
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
 * Match all request paths except for the ones starting with:
 * - api (API routes)
 * - ui-assets (UI assets)
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * Or specific files:
 * - all .svg, .png, .jpg, .webp and .jpeg files
 * - sitemap.xml
 * - robots.txt
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 */
export const config = {
  matcher: [
    '/((?!api|ui-assets|_next/static|_next/image|favicon.ico|[^/]+\\.svg|[^/]+\\.png|[^/]+\\.jpg|[^/]+\\.webp|[^/]+\\.jpeg|sitemap\\.xml|robots\\.txt).*)',
  ],
};
