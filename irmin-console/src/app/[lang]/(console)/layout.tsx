import type { Metadata } from 'next';

import { Locale } from '@/lib/dict';

import ConsoleWrapper from '@/components/console/ConsoleWrapper';

/**
 * Default layout level metadata for SEO on the console
 */
export const metadata: Metadata = {
  title: 'Console | IRMIN Console',
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
