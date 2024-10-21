import type { Metadata } from 'next';

import { getDict } from '@/lib/actions/dict';
import { getWorkspaces } from '@/lib/actions/workspaces';
import { Locale } from '@/lib/dict';

import ConsoleWrapper from '@/components/console/ConsoleWrapper';

import { PopupProvider } from '@/context/PopupContext';

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
 * Wraps the pages with {@link PopupProvider} and {@link ConsoleWrapper}
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

  const [workspaces, { dict }] = await Promise.all([
    getWorkspaces(),
    getDict(),
  ]);

  return (
    <PopupProvider>
      <ConsoleWrapper workspaces={workspaces} dict={dict}>
        {children}
      </ConsoleWrapper>
    </PopupProvider>
  );
}
