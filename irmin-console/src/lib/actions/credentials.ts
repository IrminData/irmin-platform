'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of the user's system tokens.
 *
 * @param token - Optional token for authentication.
 * @returns The API response containing the system tokens.
 */
export async function getSystemTokens(token?: string) {
  const irminCore = await initCore(token);
  // Get the tokens
  const res = await irminCore.credentialService.getSystemTokens();
  return res;
}

/**
 * Server action to create a new system token.
 *
 * @param name - Name of the new system token.
 * @param expiry - Time until expiration from the current date and time, in seconds.
 * @param token - Optional token for authentication.
 * @returns The API response containing the created system token.
 */
export async function createSystemToken(
  name: string,
  expiry: number,
  token?: string
) {
  const irminCore = await initCore(token);
  // Create the token using updated parameter object
  const res = await irminCore.credentialService.createSystemToken({
    name,
    expiry,
  });
  return res;
}

/**
 * Server action to revoke and delete a system token.
 *
 * @param tokenId - The token identifier to be revoked.
 * @param token - Optional token for authentication.
 * @returns The API response containing the result of the revocation.
 */
export async function revokeSystemToken(tokenId: string, token?: string) {
  const irminCore = await initCore(token);
  // Revoke the token using updated parameter object
  const res = await irminCore.credentialService.revokeSystemToken({
    token: tokenId,
  });
  return res;
}
