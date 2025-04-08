import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getDict } from '@/lib/actions/dict';
import { getWorkspaces } from '@/lib/actions/workspaces';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

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

  const token = await getToken();
  const [workspaces, { dict }] = await Promise.all([
    getWorkspaces({ token }),
    getDict(),
  ]);

  return (
    <ConsoleWrapper workspaces={workspaces.data ?? []} dict={dict}>
      {children}
    </ConsoleWrapper>
  );
}
