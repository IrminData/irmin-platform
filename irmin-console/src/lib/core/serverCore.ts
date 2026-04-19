import { cache } from 'react';

import IrminCore from '@/lib/core/IrminCore';
import type { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

/**
 * Return a server-side {@link IrminCore} instance for the given locale.
 *
 * Wrapped with {@link cache} so every `generateMetadata` and page component
 * in a single render pass shares the same instance — and, by extension, the
 * same Clerk token lookup. Metadata layouts that chain up the route tree
 * (workspace → repository → subpage) pay for the token handshake once.
 */
export const getServerCore = cache(
  async (locale: Locale): Promise<IrminCore> => {
    const token = await getToken();
    return new IrminCore(locale, token);
  }
);
