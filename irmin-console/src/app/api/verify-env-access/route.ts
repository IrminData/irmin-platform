import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { env } from '@/config/env.server';
import { getLocale } from '@/proxy';

import { hmacPassword } from '@/utils/hmac';

const appPassword = env.ENV_PASSWORD;
const requireAuth = env.REQUIRE_ENV_AUTH;
const app_base = env.NEXT_PUBLIC_BASE_URL;

/** Cookie expiry: 7 days */
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * HTML form for signing in to the development environment
 *
 * @remarks
 * This form is displayed when the user tries to access the development environment.
 * The form contains a password input field and a submit button.
 * When submitted in will POST /api/verify-env-access with the password.
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
<form action="${app_base}/api/verify-env-access" method="post">
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
 * GET request handler for verify-env-access
 *
 * Can be accessed at GET /api/verify-env-access
 *
 * Users will be redirected to this page when they try to access the development environment
 * without being authorised.
 *
 * @param req - Request object
 * @returns HTML form for signing in to the development environment, or redirect if auth is not required
 */
export async function GET(req: NextRequest) {
  // If auth is not required and no password is set, redirect directly to home
  if (!requireAuth && !appPassword) {
    const locale = getLocale(req);
    const expires = new Date(Date.now() + COOKIE_MAX_AGE_MS);
    const setCookieHeader = `authorisedDev=no-auth-required; Expires=${expires.toUTCString()}; Path=/; HttpOnly; Secure; SameSite=Lax`;

    const headers = new Headers();
    headers.append('Set-Cookie', setCookieHeader);
    headers.append('Location', `/${locale}`);
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
 * Handler for POST request to verify-env-access
 *
 * Can be accessed at POST /api/verify-env-access
 *
 * This handler is used to verify the password entered by the user to access the development environment.
 * If the password is correct, a cookie is set and the user is redirected to the home page with locale.
 *
 * If the password is incorrect, a 403 Forbidden response is returned.
 *
 * The password is stored in the environment variable ENV_PASSWORD.
 * This password is required when REQUIRE_ENV_AUTH is set to true.
 *
 * @param req - Request object
 * @returns Response object - Redirects to the home page with locale prefix
 */
export async function POST(req: NextRequest) {
  const locale = getLocale(req);

  // Check if password is configured when auth is required
  if (!appPassword) {
    if (requireAuth) {
      return new NextResponse('Development access not configured', {
        status: 503,
      });
    } else {
      // If auth is not required, allow access without password verification
      const expires = new Date(Date.now() + COOKIE_MAX_AGE_MS);
      const setCookieHeader = `authorisedDev=no-auth-required; Expires=${expires.toUTCString()}; Path=/; HttpOnly; Secure; SameSite=Lax`;

      const headers = new Headers();
      headers.append('Set-Cookie', setCookieHeader);
      headers.append('Location', `/${locale}`);
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

  // Set the cookie with HMAC of password instead of plaintext
  const expires = new Date(Date.now() + COOKIE_MAX_AGE_MS);
  const hashedPassword = await hmacPassword(appPassword);
  const setCookieHeader = `authorisedDev=${hashedPassword}; Expires=${expires.toUTCString()}; Path=/; HttpOnly; Secure; SameSite=Lax`;

  // Redirect to the home page with locale prefix
  const headers = new Headers();
  headers.append('Set-Cookie', setCookieHeader);
  headers.append('Location', `/${locale}`);
  return new NextResponse(null, { status: 302, headers });
}
