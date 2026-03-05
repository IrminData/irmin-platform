/**
 * Server-side HMAC secret used as the signing key. Falls back to a
 * deterministic derivation from ENV_PASSWORD when HMAC_SECRET is not set,
 * but a separate random secret is strongly recommended in production.
 */
const hmacSecret = process.env.HMAC_SECRET ?? process.env.ENV_PASSWORD ?? '';

/**
 * Generate an HMAC of the password using the Web Crypto API so the raw secret
 * is never stored in the cookie. Uses HMAC_SECRET as the key (separate from
 * the password) to prevent offline brute-force recovery of ENV_PASSWORD from
 * the cookie value. Works in both Node.js and Edge runtimes.
 *
 * @param password - The password to sign
 * @returns HMAC hex digest
 */
export async function hmacPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hmacSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(password)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
