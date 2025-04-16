'use server';

import { cookies } from 'next/headers';

import { auth } from '@clerk/nextjs/server';

/**
 * Get the API token for the current user.
 *
 * Check if the user is signed in and get the token from the cookie store if available.
 * If the token is not available, fetch a new token from Clerk. Try to update the cookie if the token is fetched.
 */
export async function getToken(): Promise<string> {
  // Get the cookie store
  const cookieStore = await cookies();

  // Get the user and token
  const { userId, getToken } = await auth();
  if (!userId) throw new Error('User not signed in');

  // Define the cookie name
  const tokenCookieName = 'irmin-core-token';

  // Try to get the token from the cookie
  let token = cookieStore.get(tokenCookieName)?.value ?? null;

  if (!token) {
    // Fetch a new token
    token = await getToken({ template: 'irmin-core' });
    if (!token) throw new Error('Failed to get token');

    try {
      // Set the token in an HTTP-only, secure cookie with expiry
      cookieStore.set(tokenCookieName, token, {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 60, // Token expires in 60 seconds
      });
    } finally {
      return token;
    }
  }

  return token;
}
