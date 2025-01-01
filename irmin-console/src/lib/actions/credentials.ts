'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of the user's system tokens.
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
 * @param name - Name of the new system token
 * @param expiry - Time until expiration from the current date and time. In seconds.
 */
export async function createSystemToken(
  name: string,
  expiry: number,
  token?: string
) {
  const irminCore = await initCore(token);
  // Create the token
  const res = await irminCore.credentialService.createSystemToken(name, expiry);
  return res;
}

/**
 * Server action to revoke and delete a system token.
 */
export async function revokeSystemToken(tokenId: string, token?: string) {
  const irminCore = await initCore(token);
  // Delete the token
  const res = await irminCore.credentialService.revokeSystemToken(tokenId);
  return res;
}
