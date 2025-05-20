import type { Metadata } from 'next';

import { generateSearchItems } from '@/lib/actions/searchItems';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

import ConsoleWrapper from '@/components/console/ConsoleWrapper';

import { ConsoleSearchProvider } from '@/context/ConsoleSearchContext';

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

  const token = await getToken();

  const searchItems = await generateSearchItems({ token });

  return (
    <ConsoleSearchProvider initialSearchItems={searchItems}>
      <ConsoleWrapper>{children}</ConsoleWrapper>
    </ConsoleSearchProvider>
  );
}
