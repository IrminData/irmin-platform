import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'fi'];
const DEFAULT_LOCALE = 'en';

function getLocaleFromHeader(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim())
      .find((lang) => locales.includes(lang));
    if (preferredLocale) {
      return preferredLocale;
    }
  }
  return DEFAULT_LOCALE;
}

function getLocaleFromCookies(request: NextRequest): string | null {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }
  return null;
}

function setLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  }); // Set cookie for 1 year
}

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

export const config = {
  matcher: [
    /**
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - ui-assets (UI assets)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * Or specific files:
     * - all .svg, .png, .jpg, .webp and .jpeg files
     * - sitemap.xml
     * - robots.txt
     */
    '/((?!api|ui-assets|_next/static|_next/image|favicon.ico|[^/]+\\.svg|[^/]+\\.png|[^/]+\\.jpg|[^/]+\\.webp|[^/]+\\.jpeg|sitemap\\.xml|robots\\.txt).*)',
  ],
};
