import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'true';
  if (requireAuth === 'true') {
    // Get the cookies from the request
    const { cookies } = req;
    const authorizedDev = cookies.get('authorizedDev');
    // Check if the user is authorized
    if (!authorizedDev || authorizedDev.value !== 'true') {
      // Redirect to the sign-in page if not authorized
      return NextResponse.redirect(new URL('/api/verify-dev-access', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
