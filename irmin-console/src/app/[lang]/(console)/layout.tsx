import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';
import { ROBOTS_CONSOLE } from '@/lib/metadata';

import ConsoleWrapper from '@/components/console/ConsoleWrapper';

/**
 * Console shell metadata. The shell intentionally does not set a title —
 * descendant layouts (workspace, resource, …) own title composition and
 * compose their template against the root `%s · Irmin`. The shell only
 * asserts the robots policy so every in-app route inherits `noindex,nofollow`.
 */
export const metadata: Metadata = {
  robots: ROBOTS_CONSOLE,
};

/**
 * Console layout
 *
 * This layout is used for all pages within the Irmin console.
 *
 * @param props - Layout properties
 * @param props.children - Page content
 * @param props.params - Page parameters
 */
export default async function ConsoleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { children } = props;

  return <ConsoleWrapper>{children}</ConsoleWrapper>;
}
