import type { Metadata } from 'next';

import { ROBOTS_CONSOLE, SITE_NAME } from '@/lib/metadata';

export const metadata: Metadata = {
  title: SITE_NAME,
  robots: ROBOTS_CONSOLE,
};

/**
 * Root landing page — traffic is redirected to the locale-prefixed home by
 * the auth proxy, so this component renders nothing.
 */
export default function Page() {
  return <></>;
}
