import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const appPassword = process.env.ENV_PASSWORD;
const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'true';
const app_base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

// Validate that password is set when auth is required in production environments
if (
  requireAuth === 'true' &&
  !appPassword &&
  process.env.NODE_ENV === 'production'
) {
  throw new Error(
    'ENV_PASSWORD environment variable must be set when REQUIRE_ENV_AUTH is true in production'
  );
}

/**
 * HTML form for signing in to the development environment
 *
 * @remarks
 * This form is displayed when the user tries to access the development environment.
 * The form contains a password input field and a submit button.
 * When submitted in will POST /api/verify-dev-access with the password.
 */
const signIn = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sign in to environment</title>
</head>
<body>
<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
.signInDev {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.signInDev label {
  margin-bottom: 1rem;
}
.signInDev input {
  margin-bottom: 1rem;
}
</style>
<form action="${app_base}/api/verify-dev-access" method="post">
<div class="signInDev">
<label for="password">Enter password to access this environment</label>
<input type="password" name="password" id="password" placeholder="Password">
<button type="submit">Sign in</button>
</div>
</form>
</body>
</html>
`;

/**
 * GET request handler for verify-dev-access
 *
 * Can be accessed at GET /api/verify-dev-access
 *
 * Users will be redirected to this page when they try to access the development environment
 * without being authorised.
 *
 * @returns HTML form for signing in to the development environment, or redirect if auth is not required
 */
export async function GET() {
  // If auth is not required and no password is set, redirect directly to home
  if (requireAuth !== 'true' && !appPassword) {
    const expires = new Date(Date.now() + 60 * 60 * 24 * 12 * 365 * 100);
    const setCookieHeader = `authorisedDev=no-auth-required; Expires=${expires.toUTCString()}; Path=/; HttpOnly`;

    const headers = new Headers();
    headers.append('Set-Cookie', setCookieHeader);
    headers.append('Location', '/');
    return new NextResponse(null, { status: 302, headers });
  }

  const response = new NextResponse(signIn, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
  return response;
}

/**
 * Handler for POST request to verify-dev-access
 *
 * Can be accessed at POST /api/verify-dev-access
 *
 * This handler is used to verify the password entered by the user to access the development environment.
 * If the password is correct, a cookie is set and the user is redirected to the home page.
 *
 * If the password is incorrect, a 403 Forbidden response is returned.
 *
 * The password is stored in the environment variable ENV_PASSWORD.
 * This password is required when REQUIRE_ENV_AUTH is set to true.
 *
 * @param req - Request object
 * @returns Response object - Redirects to the home page
 */
export async function POST(req: NextRequest) {
  // Check if password is configured when auth is required
  if (!appPassword) {
    if (requireAuth === 'true') {
      return new NextResponse('Development access not configured', {
        status: 503,
      });
    } else {
      // If auth is not required, allow access without password verification
      const expires = new Date(Date.now() + 60 * 60 * 24 * 12 * 365 * 100);
      const setCookieHeader = `authorisedDev=no-auth-required; Expires=${expires.toUTCString()}; Path=/; HttpOnly`;

      const headers = new Headers();
      headers.append('Set-Cookie', setCookieHeader);
      headers.append('Location', '/');
      return new NextResponse(null, { status: 302, headers });
    }
  }

  // Parse the request body
  const body = await req.formData();
  const password = body.get('password');

  // Validate the password
  if (typeof password !== 'string') {
    return new NextResponse('Password is not a string', { status: 400 });
  }
  if (password !== appPassword) {
    return new NextResponse('Wrong password', { status: 403 });
  }

  // Set the cookie
  const expires = new Date(Date.now() + 60 * 60 * 24 * 12 * 365 * 100);
  const setCookieHeader = `authorisedDev=${appPassword}; Expires=${expires.toUTCString()}; Path=/; HttpOnly`;

  // Redirect to the home page
  const headers = new Headers();
  headers.append('Set-Cookie', setCookieHeader);
  headers.append('Location', '/');
  return new NextResponse(null, { status: 302, headers });
}
