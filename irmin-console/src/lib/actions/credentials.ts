'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of the user's system tokens.
 *
 * @param props - The properties for the function.
 * @param props.token - Optional token for authentication.
 * @returns The API response containing the system tokens.
 */
export async function getSystemTokens({ token }: { token?: string }) {
  const irminCore = await initCore(token);
  // Get the tokens
  const res = await irminCore.credentialService.getSystemTokens();
  return res;
}
